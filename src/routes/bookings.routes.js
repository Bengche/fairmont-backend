import express from "express";
import { body, validationResult } from "express-validator";
import pool from "../config/db.js";
import { authenticate } from "../middleware/auth.js";
import { uploadReceipt } from "../middleware/upload.js";
import { generateReference } from "../utils/generateReference.js";
import { validateBookingDates } from "../utils/validateDates.js";
import {
  sendBookingReceived,
  sendReceiptConfirmationToGuest,
  sendReceiptNotificationToSupport,
  sendBookingCancelled,
} from "../services/email.service.js";

const router = express.Router();

const TAX_RATE = 0.15; // 15% HST Canada

// POST /api/bookings — create booking
router.post(
  "/",
  [
    body("room_id").notEmpty().withMessage("Room ID is required."),
    body("check_in").isDate().withMessage("Valid check-in date required."),
    body("check_out").isDate().withMessage("Valid check-out date required."),
    body("guest_first_name").trim().notEmpty(),
    body("guest_last_name").trim().notEmpty(),
    body("guest_email").isEmail().normalizeEmail(),
    body("guest_phone").trim().notEmpty(),
    body("adults").isInt({ min: 1 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

      const {
        room_id,
        check_in,
        check_out,
        guest_first_name,
        guest_last_name,
        guest_email,
        guest_phone,
        guest_country,
        adults,
        children = 0,
        addons = [],
        special_requests,
        arrival_time,
        promo_code,
        user_id,
      } = req.body;

      const dateCheck = validateBookingDates(check_in, check_out);
      if (!dateCheck.valid)
        return res.status(400).json({ error: dateCheck.message });

      // Check room exists
      const { rows: roomRows } = await pool.query(
        "SELECT * FROM rooms WHERE id = $1 AND is_available = true",
        [room_id],
      );
      if (!roomRows.length)
        return res
          .status(404)
          .json({ error: "Room not found or unavailable." });
      const room = roomRows[0];

      // Check no conflicting booking
      const { rows: conflict } = await pool.query(
        `
      SELECT id FROM bookings
      WHERE room_id = $1 AND status NOT IN ('cancelled')
        AND check_in < $3 AND check_out > $2
    `,
        [room_id, check_in, check_out],
      );
      if (conflict.length)
        return res
          .status(409)
          .json({ error: "Room is not available for the selected dates." });

      // Calculate pricing
      const nights = dateCheck.nights;
      const roomTotal = parseFloat(room.price_per_night) * nights;
      let addonsTotal = 0;
      const validAddons = [
        { key: "airport_transfer", label: "Airport Transfer", price: 75 },
        { key: "spa_package", label: "Spa Package", price: 150 },
        {
          key: "champagne_flowers",
          label: "Welcome Champagne & Flowers",
          price: 95,
        },
        { key: "late_checkout", label: "Late Checkout", price: 75 },
        { key: "early_checkin", label: "Early Check-in", price: 75 },
        {
          key: "daily_breakfast",
          label: "Daily Breakfast",
          price: 45 * (adults + children) * nights,
        },
      ];

      const selectedAddons = [];
      if (Array.isArray(addons)) {
        for (const key of addons) {
          const found = validAddons.find((a) => a.key === key);
          if (found) {
            addonsTotal += found.price;
            selectedAddons.push({
              key: found.key,
              label: found.label,
              price: found.price,
            });
          }
        }
      }

      // Promo code check
      let discountAmount = 0;
      if (promo_code) {
        const { rows: offerRows } = await pool.query(
          `SELECT * FROM offers WHERE promo_code = $1 AND is_active = true
         AND (valid_from IS NULL OR valid_from <= CURRENT_DATE)
         AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)`,
          [promo_code.toUpperCase()],
        );
        if (offerRows.length) {
          const offer = offerRows[0];
          if (offer.discount_type === "percentage") {
            discountAmount = (roomTotal * offer.discount_value) / 100;
          } else {
            discountAmount = offer.discount_value;
          }
        }
      }

      const subtotal = roomTotal + addonsTotal - discountAmount;
      const taxAmount = subtotal * TAX_RATE;
      const totalAmount = subtotal + taxAmount;

      const reference_number = generateReference();

      const { rows: bookingRows } = await pool.query(
        `
      INSERT INTO bookings (
        reference_number, user_id, room_id,
        guest_first_name, guest_last_name, guest_email, guest_phone, guest_country,
        check_in, check_out, nights, adults, children,
        addons, addons_total, subtotal, tax_amount, total_amount,
        special_requests, arrival_time, promo_code, discount_amount
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
      RETURNING *
    `,
        [
          reference_number,
          user_id || null,
          room_id,
          guest_first_name,
          guest_last_name,
          guest_email,
          guest_phone,
          guest_country || null,
          check_in,
          check_out,
          nights,
          adults,
          children,
          JSON.stringify(selectedAddons),
          addonsTotal,
          subtotal,
          taxAmount,
          totalAmount,
          special_requests || null,
          arrival_time || null,
          promo_code || null,
          discountAmount,
        ],
      );

      const booking = { ...bookingRows[0], room_name: room.name };

      // Fetch bank details from DB
      const { rows: configRows } = await pool.query(
        "SELECT key, value FROM site_config",
      );
      const bankDetails = {};
      configRows.forEach((r) => {
        bankDetails[r.key] = r.value;
      });

      try {
        await sendBookingReceived(booking, bankDetails);
      } catch (_) {}

      res.status(201).json({ booking: bookingRows[0] });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/bookings/user/mine
router.get("/user/mine", authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT b.*, r.name as room_name, r.images as room_images
      FROM bookings b
      LEFT JOIN rooms r ON b.room_id = r.id
      WHERE b.guest_email = $1
      ORDER BY b.created_at DESC
    `,
      [req.user.email],
    );
    res.json({ bookings: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/bookings/:reference
router.get("/:reference", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT b.*, r.name as room_name, r.images as room_images, r.price_per_night,
             rc.name as category_name
      FROM bookings b
      LEFT JOIN rooms r ON b.room_id = r.id
      LEFT JOIN room_categories rc ON r.category_id = rc.id
      WHERE b.reference_number = $1
    `,
      [req.params.reference],
    );

    if (!rows.length)
      return res.status(404).json({ error: "Booking not found." });
    res.json({ booking: rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /api/bookings/:reference/receipt
router.post(
  "/:reference/receipt",
  uploadReceipt.single("receipt"),
  async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        "SELECT * FROM bookings WHERE reference_number = $1",
        [req.params.reference],
      );
      if (!rows.length)
        return res.status(404).json({ error: "Booking not found." });

      const booking = rows[0];
      if (!req.file)
        return res.status(400).json({ error: "Receipt file is required." });

      const receiptUrl = `/uploads/receipts/${req.file.filename}`;
      const note = req.body.note || null;

      await pool.query(
        `
      UPDATE bookings
      SET payment_receipt_url = $1,
          payment_receipt_note = $2,
          payment_submitted_at = NOW(),
          status = 'pending_verification',
          updated_at = NOW()
      WHERE reference_number = $3
    `,
        [receiptUrl, note, req.params.reference],
      );

      const { rows: roomRows } = await pool.query(
        "SELECT name FROM rooms WHERE id = $1",
        [booking.room_id],
      );
      const fullBooking = {
        ...booking,
        room_name: roomRows[0]?.name || "Room",
      };

      try {
        await sendReceiptConfirmationToGuest(fullBooking);
      } catch (_) {}
      try {
        await sendReceiptNotificationToSupport(fullBooking, receiptUrl);
      } catch (_) {}

      res.json({
        message:
          "Receipt uploaded successfully. Your booking is pending verification.",
      });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/bookings/:reference/bank-details
router.get("/:reference/bank-details", async (req, res, next) => {
  try {
    const { rows: bookingRows } = await pool.query(
      "SELECT id FROM bookings WHERE reference_number = $1",
      [req.params.reference],
    );
    if (!bookingRows.length)
      return res.status(404).json({ error: "Booking not found." });

    const { rows } = await pool.query("SELECT key, value FROM site_config");
    const bankDetails = {};
    rows.forEach((r) => {
      bankDetails[r.key] = r.value;
    });
    res.json({ bankDetails });
  } catch (err) {
    next(err);
  }
});

export default router;
