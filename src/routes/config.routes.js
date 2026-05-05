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

export default router;
