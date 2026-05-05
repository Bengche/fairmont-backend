import express from "express";
import pool from "../config/db.js";

const router = express.Router();

// GET /api/offers
router.get("/", async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM offers
      WHERE is_active = true
        AND (valid_from IS NULL OR valid_from <= CURRENT_DATE)
        AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
      ORDER BY display_order ASC
    `);
    res.json({ offers: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/offers/:slug
router.get("/:slug", async (req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT * FROM offers WHERE slug = $1", [
      req.params.slug,
    ]);
    if (!rows.length)
      return res.status(404).json({ error: "Offer not found." });
    res.json({ offer: rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /api/offers/validate-code
router.post("/validate-code", async (req, res, next) => {
  try {
    const { promo_code } = req.body;
    if (!promo_code)
      return res.status(400).json({ error: "Promo code is required." });

    const { rows } = await pool.query(
      `
      SELECT * FROM offers
      WHERE UPPER(promo_code) = UPPER($1)
        AND is_active = true
        AND (valid_from IS NULL OR valid_from <= CURRENT_DATE)
        AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
    `,
      [promo_code],
    );

    if (!rows.length)
      return res.status(404).json({ error: "Invalid or expired promo code." });
    const o = rows[0];
    res.json({
      valid: true,
      discount_type: o.discount_type,
      discount_value: o.discount_value,
      title: o.title,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
