import express from "express";
import { body, validationResult } from "express-validator";
import pool from "../config/db.js";

const router = express.Router();

// GET /api/reviews/room/:room_id
router.get("/room/:room_id", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM reviews WHERE room_id = $1 AND is_approved = true ORDER BY created_at DESC",
      [req.params.room_id],
    );
    res.json({ reviews: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/reviews (approved, for homepage)
router.get("/", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM reviews WHERE is_approved = true ORDER BY created_at DESC LIMIT 10",
    );
    res.json({ reviews: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/reviews
router.post(
  "/",
  [
    body("guest_name").trim().notEmpty(),
    body("rating").isInt({ min: 1, max: 5 }),
    body("title").trim().notEmpty(),
    body("body").trim().notEmpty(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

      const {
        guest_name,
        rating,
        title,
        body: reviewBody,
        booking_id,
        room_id,
      } = req.body;
      await pool.query(
        "INSERT INTO reviews (guest_name, rating, title, body, booking_id, room_id) VALUES ($1,$2,$3,$4,$5,$6)",
        [
          guest_name,
          rating,
          title,
          reviewBody,
          booking_id || null,
          room_id || null,
        ],
      );
      res
        .status(201)
        .json({ message: "Review submitted. It will appear once approved." });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
