import express from "express";
import { body, validationResult } from "express-validator";
import pool from "../config/db.js";
import { adminAuth } from "../middleware/adminAuth.js";
import {
  sendBookingConfirmed,
  sendBookingCancelled,
} from "../services/email.service.js";

const router = express.Router();

// All admin routes require admin auth
router.use(adminAuth);

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
router.get("/stats", async (req, res, next) => {
  try {
    const [bookings, revenue, rooms, pendingReceipts, recentBookingsResult] =
      await Promise.all([
        pool.query(
          `SELECT COUNT(*) as total, status FROM bookings GROUP BY status`,
        ),
        pool.query(
          `SELECT COALESCE(SUM(total_amount),0) as total FROM bookings WHERE status IN ('confirmed','checked_in','checked_out')`,
        ),
        pool.query(
          `SELECT COUNT(*) as total FROM rooms WHERE is_available = true`,
        ),
        pool.query(
          `SELECT COUNT(*) as total FROM bookings WHERE status = 'pending_verification'`,
        ),
        pool.query(
          `SELECT b.reference_number as reference,
          (b.guest_first_name || ' ' || b.guest_last_name) as guest_name,
          r.name as room_name, b.total_amount, b.status, b.created_at
         FROM bookings b LEFT JOIN rooms r ON b.room_id = r.id
         ORDER BY b.created_at DESC LIMIT 10`,
        ),
      ]);

    const bookingsByStatus = {};
    bookings.rows.forEach((r) => {
      bookingsByStatus[r.status] = Number(r.total);
    });

    const totalBookings = Object.values(bookingsByStatus).reduce(
      (sum, n) => sum + n,
      0,
    );

    res.json({
      totalBookings,
      confirmed: bookingsByStatus["confirmed"] ?? 0,
      totalRevenue: Number(revenue.rows[0].total),
      availableRooms: Number(rooms.rows[0].total),
      pendingVerification: Number(pendingReceipts.rows[0].total),
      bookingsByStatus,
      recentBookings: recentBookingsResult.rows,
    });
  } catch (err) {
    next(err);
  }
});

// ─── Bookings ─────────────────────────────────────────────────────────────────
router.get("/bookings", async (req, res, next) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    let query = `
      SELECT b.*, r.name as room_name
      FROM bookings b LEFT JOIN rooms r ON b.room_id = r.id
    `;
    const params = [];
    if (status) {
      query += ` WHERE b.status = $1`;
      params.push(status);
    }
    query += ` ORDER BY b.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Number(limit), Number(offset));

    const { rows } = await pool.query(
      query.replace(
        "SELECT b.*, r.name as room_name",
        `SELECT b.*, r.name as room_name,
        b.reference_number as reference,
        (b.guest_first_name || ' ' || b.guest_last_name) as guest_name,
        b.payment_receipt_url as receipt_url`,
      ),
      params,
    );
    res.json({ bookings: rows });
  } catch (err) {
    next(err);
  }
});

router.patch(
  "/bookings/:id/status",
  [
    body("status").isIn([
      "confirmed",
      "cancelled",
      "checked_in",
      "checked_out",
      "pending_payment",
      "pending_verification",
    ]),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

      const { status, cancellation_reason } = req.body;

      const { rows: existing } = await pool.query(
        "SELECT b.*, r.name as room_name FROM bookings b LEFT JOIN rooms r ON b.room_id = r.id WHERE b.id = $1",
        [req.params.id],
      );
      if (!existing.length)
        return res.status(404).json({ error: "Booking not found." });
      const booking = existing[0];

      const updates = { status, updated_at: new Date() };
      if (status === "confirmed") updates.payment_verified_at = new Date();
      if (status === "cancelled") {
        updates.cancelled_at = new Date();
        updates.cancellation_reason = cancellation_reason || null;
      }

      await pool.query(
        `UPDATE bookings SET status=$1, payment_verified_at=$2, cancelled_at=$3, cancellation_reason=$4, updated_at=NOW() WHERE id=$5`,
        [
          status,
          updates.payment_verified_at || null,
          updates.cancelled_at || null,
          updates.cancellation_reason || null,
          req.params.id,
        ],
      );

      if (status === "confirmed") {
        try {
          await sendBookingConfirmed({
            ...booking,
            room_name: booking.room_name,
          });
        } catch (_) {}
      }
      if (status === "cancelled") {
        try {
          await sendBookingCancelled({
            ...booking,
            room_name: booking.room_name,
          });
        } catch (_) {}
      }

      res.json({ message: "Booking status updated." });
    } catch (err) {
      next(err);
    }
  },
);

// ─── Rooms CRUD ───────────────────────────────────────────────────────────────
router.get("/rooms", async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT r.*, rc.name as category_name FROM rooms r
      LEFT JOIN room_categories rc ON r.category_id = rc.id
      ORDER BY r.display_order ASC
    `);
    res.json({ rooms: rows });
  } catch (err) {
    next(err);
  }
});

router.post("/rooms", async (req, res, next) => {
  try {
    const r = req.body;
    const { rows } = await pool.query(
      `
      INSERT INTO rooms (category_id, name, slug, description, short_description, price_per_night,
        max_occupancy, adults, children, size_sqft, floor_level, view_type, bed_type,
        bathroom_type, features, amenities, images, is_available, is_featured, display_order)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
      RETURNING *
    `,
      [
        r.category_id,
        r.name,
        r.slug,
        r.description,
        r.short_description,
        r.price_per_night,
        r.max_occupancy,
        r.adults,
        r.children || 0,
        r.size_sqft,
        r.floor_level,
        r.view_type,
        r.bed_type,
        r.bathroom_type,
        JSON.stringify(r.features || []),
        JSON.stringify(r.amenities || []),
        JSON.stringify(r.images || []),
        r.is_available !== false,
        r.is_featured || false,
        r.display_order || 0,
      ],
    );
    res.status(201).json({ room: rows[0] });
  } catch (err) {
    next(err);
  }
});

router.put("/rooms/:id", async (req, res, next) => {
  try {
    const r = req.body;
    await pool.query(
      `
      UPDATE rooms SET category_id=$1, name=$2, slug=$3, description=$4, short_description=$5,
        price_per_night=$6, max_occupancy=$7, adults=$8, children=$9, size_sqft=$10,
        floor_level=$11, view_type=$12, bed_type=$13, bathroom_type=$14, features=$15,
        amenities=$16, images=$17, is_available=$18, is_featured=$19, display_order=$20, updated_at=NOW()
      WHERE id=$21
    `,
      [
        r.category_id,
        r.name,
        r.slug,
        r.description,
        r.short_description,
        r.price_per_night,
        r.max_occupancy,
        r.adults,
        r.children || 0,
        r.size_sqft,
        r.floor_level,
        r.view_type,
        r.bed_type,
        r.bathroom_type,
        JSON.stringify(r.features || []),
        JSON.stringify(r.amenities || []),
        JSON.stringify(r.images || []),
        r.is_available !== false,
        r.is_featured || false,
        r.display_order || 0,
        req.params.id,
      ],
    );
    res.json({ message: "Room updated." });
  } catch (err) {
    next(err);
  }
});

router.delete("/rooms/:id", async (req, res, next) => {
  try {
    await pool.query("UPDATE rooms SET is_available = false WHERE id = $1", [
      req.params.id,
    ]);
    res.json({ message: "Room deactivated." });
  } catch (err) {
    next(err);
  }
});

// ─── Offers CRUD ──────────────────────────────────────────────────────────────
router.get("/offers", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM offers ORDER BY display_order ASC",
    );
    res.json({ offers: rows });
  } catch (err) {
    next(err);
  }
});

router.post("/offers", async (req, res, next) => {
  try {
    const o = req.body;
    const { rows } = await pool.query(
      `
      INSERT INTO offers (title, slug, description, short_description, promo_code,
        discount_type, discount_value, valid_from, valid_until, image_url, is_active, display_order)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *
    `,
      [
        o.title,
        o.slug,
        o.description,
        o.short_description,
        o.promo_code,
        o.discount_type,
        o.discount_value,
        o.valid_from || null,
        o.valid_until || null,
        o.image_url || null,
        o.is_active !== false,
        o.display_order || 0,
      ],
    );
    res.status(201).json({ offer: rows[0] });
  } catch (err) {
    next(err);
  }
});

router.put("/offers/:id", async (req, res, next) => {
  try {
    const o = req.body;
    await pool.query(
      `
      UPDATE offers SET title=$1, slug=$2, description=$3, short_description=$4,
        promo_code=$5, discount_type=$6, discount_value=$7, valid_from=$8,
        valid_until=$9, image_url=$10, is_active=$11, display_order=$12
      WHERE id=$13
    `,
      [
        o.title,
        o.slug,
        o.description,
        o.short_description,
        o.promo_code,
        o.discount_type,
        o.discount_value,
        o.valid_from || null,
        o.valid_until || null,
        o.image_url || null,
        o.is_active !== false,
        o.display_order || 0,
        req.params.id,
      ],
    );
    res.json({ message: "Offer updated." });
  } catch (err) {
    next(err);
  }
});

// ─── Blog CRUD ────────────────────────────────────────────────────────────────
router.get("/blog", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM blog_posts ORDER BY created_at DESC",
    );
    res.json({ posts: rows });
  } catch (err) {
    next(err);
  }
});

router.post("/blog", async (req, res, next) => {
  try {
    const p = req.body;
    const { rows } = await pool.query(
      `
      INSERT INTO blog_posts (title, slug, excerpt, body, author_id, category, tags, cover_image, is_published, published_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
    `,
      [
        p.title,
        p.slug,
        p.excerpt,
        p.body,
        req.user.id,
        p.category,
        JSON.stringify(p.tags || []),
        p.cover_image || null,
        p.is_published || false,
        p.is_published ? new Date() : null,
      ],
    );
    res.status(201).json({ post: rows[0] });
  } catch (err) {
    next(err);
  }
});

router.put("/blog/:id", async (req, res, next) => {
  try {
    const p = req.body;
    await pool.query(
      `
      UPDATE blog_posts SET title=$1, slug=$2, excerpt=$3, body=$4, category=$5,
        tags=$6, cover_image=$7, is_published=$8,
        published_at = CASE WHEN $8 = true AND published_at IS NULL THEN NOW() ELSE published_at END,
        updated_at = NOW()
      WHERE id=$9
    `,
      [
        p.title,
        p.slug,
        p.excerpt,
        p.body,
        p.category,
        JSON.stringify(p.tags || []),
        p.cover_image || null,
        p.is_published || false,
        req.params.id,
      ],
    );
    res.json({ message: "Post updated." });
  } catch (err) {
    next(err);
  }
});

// ─── Reviews ──────────────────────────────────────────────────────────────────
router.get("/reviews", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM reviews ORDER BY created_at DESC",
    );
    res.json({ reviews: rows });
  } catch (err) {
    next(err);
  }
});

router.patch("/reviews/:id/approve", async (req, res, next) => {
  try {
    await pool.query("UPDATE reviews SET is_approved = true WHERE id = $1", [
      req.params.id,
    ]);
    res.json({ message: "Review approved." });
  } catch (err) {
    next(err);
  }
});

// ─── Contact Submissions ──────────────────────────────────────────────────────
router.get("/contacts", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM contact_submissions ORDER BY submitted_at DESC",
    );
    res.json({ submissions: rows });
  } catch (err) {
    next(err);
  }
});

router.patch("/contacts/:id/read", async (req, res, next) => {
  try {
    await pool.query(
      "UPDATE contact_submissions SET is_read = true WHERE id = $1",
      [req.params.id],
    );
    res.json({ message: "Marked as read." });
  } catch (err) {
    next(err);
  }
});

// ─── Newsletter ───────────────────────────────────────────────────────────────
router.get("/newsletter", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM newsletter_subscribers ORDER BY subscribed_at DESC",
    );
    res.json({ subscribers: rows });
  } catch (err) {
    next(err);
  }
});

// ─── Bank Details ─────────────────────────────────────────────────────────────
router.get("/settings/bank-details", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT key, value FROM site_config WHERE key LIKE 'bank_%'`,
    );
    const bankDetails = {};
    rows.forEach((r) => {
      bankDetails[r.key] = r.value;
    });
    res.json({ bankDetails });
  } catch (err) {
    next(err);
  }
});

router.put("/settings/bank-details", async (req, res, next) => {
  try {
    const allowed = [
      "bank_name",
      "bank_account_name",
      "bank_account_number",
      "bank_routing_number",
      "bank_swift",
      "bank_iban",
      "bank_instructions",
    ];
    const updates = req.body;

    for (const key of allowed) {
      if (updates[key] !== undefined) {
        await pool.query(
          "INSERT INTO site_config (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()",
          [key, updates[key]],
        );
      }
    }
    res.json({ message: "Bank details updated successfully." });
  } catch (err) {
    next(err);
  }
});

// ─── Users ────────────────────────────────────────────────────────────────────
router.get("/users", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, first_name, last_name, email, role, loyalty_tier, loyalty_points, created_at FROM users ORDER BY created_at DESC",
    );
    res.json({ users: rows });
  } catch (err) {
    next(err);
  }
});

// ─── Seasonal Minimum Nights ─────────────────────────────────────────────────
router.get("/min-nights", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM seasonal_min_nights ORDER BY start_date ASC",
    );
    res.json({ rules: rows });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/min-nights",
  [
    body("name").trim().notEmpty().withMessage("Name is required."),
    body("min_nights")
      .isInt({ min: 1, max: 30 })
      .withMessage("min_nights must be between 1 and 30."),
    body("start_date").isDate().withMessage("Valid start_date required."),
    body("end_date").isDate().withMessage("Valid end_date required."),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

      const { name, min_nights, start_date, end_date, is_active = true } = req.body;
      const { rows } = await pool.query(
        `INSERT INTO seasonal_min_nights (name, min_nights, start_date, end_date, is_active)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [name, min_nights, start_date, end_date, is_active],
      );
      res.status(201).json({ rule: rows[0] });
    } catch (err) {
      next(err);
    }
  },
);

router.put(
  "/min-nights/:id",
  [
    body("name").trim().notEmpty().withMessage("Name is required."),
    body("min_nights")
      .isInt({ min: 1, max: 30 })
      .withMessage("min_nights must be between 1 and 30."),
    body("start_date").isDate().withMessage("Valid start_date required."),
    body("end_date").isDate().withMessage("Valid end_date required."),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

      const { name, min_nights, start_date, end_date, is_active } = req.body;
      await pool.query(
        `UPDATE seasonal_min_nights
         SET name=$1, min_nights=$2, start_date=$3, end_date=$4, is_active=$5, updated_at=NOW()
         WHERE id=$6`,
        [name, min_nights, start_date, end_date, is_active !== false, req.params.id],
      );
      res.json({ message: "Rule updated." });
    } catch (err) {
      next(err);
    }
  },
);

router.delete("/min-nights/:id", async (req, res, next) => {
  try {
    await pool.query("DELETE FROM seasonal_min_nights WHERE id = $1", [
      req.params.id,
    ]);
    res.json({ message: "Rule deleted." });
  } catch (err) {
    next(err);
  }
});

export default router;
