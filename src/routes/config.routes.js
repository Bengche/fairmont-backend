import express from "express";
import pool from "../config/db.js";

const router = express.Router();

// GET /api/config/bank-details — public endpoint for booking page
router.get("/bank-details", async (req, res, next) => {
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

// GET /api/config/min-nights — returns effective min nights for a given date (defaults to today)
router.get("/min-nights", async (req, res, next) => {
  try {
    const date = req.query.date || new Date().toISOString().split("T")[0];
    const { rows } = await pool.query(
      `SELECT min_nights FROM seasonal_min_nights
       WHERE is_active = TRUE AND start_date <= $1 AND end_date >= $1
       ORDER BY min_nights DESC LIMIT 1`,
      [date],
    );
    const seasonalMin = rows[0]?.min_nights || 1;
    res.json({ minNights: seasonalMin });
  } catch (err) {
    next(err);
  }
});

export default router;
