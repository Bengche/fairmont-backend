import express from "express";
import pool from "../config/db.js";
import { validateBookingDates } from "../utils/validateDates.js";

const router = express.Router();

// GET /api/rooms
router.get("/", async (req, res, next) => {
  try {
    const { category, min_price, max_price, adults, sort } = req.query;
    let query = `
      SELECT r.*, rc.name as category_name, rc.slug as category_slug
      FROM rooms r
      LEFT JOIN room_categories rc ON r.category_id = rc.id
      WHERE r.is_available = true
    `;
    const params = [];
    let idx = 1;

    if (category) {
      query += ` AND rc.slug = $${idx++}`;
      params.push(category);
    }
    if (min_price) {
      query += ` AND r.price_per_night >= $${idx++}`;
      params.push(Number(min_price));
    }
    if (max_price) {
      query += ` AND r.price_per_night <= $${idx++}`;
      params.push(Number(max_price));
    }
    if (adults) {
      query += ` AND r.adults >= $${idx++}`;
      params.push(Number(adults));
    }

    if (sort === "price_asc") query += " ORDER BY r.price_per_night ASC";
    else if (sort === "price_desc") query += " ORDER BY r.price_per_night DESC";
    else query += " ORDER BY r.display_order ASC";

    const { rows } = await pool.query(query, params);
    res.json({ rooms: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/rooms/categories
router.get("/categories", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM room_categories ORDER BY display_order ASC",
    );
    res.json({ categories: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/rooms/check-availability
router.post("/check-availability", async (req, res, next) => {
  try {
    const { check_in, check_out } = req.body;
    const dateCheck = validateBookingDates(check_in, check_out);
    if (!dateCheck.valid)
      return res.status(400).json({ error: dateCheck.message });

    // Find rooms not booked in that period
    const { rows } = await pool.query(
      `
      SELECT r.*, rc.name as category_name, rc.slug as category_slug
      FROM rooms r
      LEFT JOIN room_categories rc ON r.category_id = rc.id
      WHERE r.is_available = true
        AND r.id NOT IN (
          SELECT room_id FROM bookings
          WHERE status NOT IN ('cancelled')
            AND check_in < $2
            AND check_out > $1
        )
      ORDER BY r.price_per_night ASC
    `,
      [check_in, check_out],
    );

    res.json({ rooms: rows, nights: dateCheck.nights, check_in, check_out });
  } catch (err) {
    next(err);
  }
});

// GET /api/rooms/:slug
router.get("/:slug", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT r.*, rc.name as category_name, rc.slug as category_slug
      FROM rooms r
      LEFT JOIN room_categories rc ON r.category_id = rc.id
      WHERE r.slug = $1
    `,
      [req.params.slug],
    );

    if (!rows.length) return res.status(404).json({ error: "Room not found." });
    res.json({ room: rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
