import express from "express";
import { body, validationResult } from "express-validator";
import pool from "../config/db.js";

const router = express.Router();

router.post(
  "/",
  [
    body("name").trim().notEmpty(),
    body("email").isEmail().normalizeEmail(),
    body("message").trim().notEmpty(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

      const { name, email, phone, subject, message } = req.body;
      await pool.query(
        "INSERT INTO contact_submissions (name, email, phone, subject, message) VALUES ($1,$2,$3,$4,$5)",
        [name, email, phone || null, subject || null, message],
      );
      res.json({
        message:
          "Your message has been received. Our team will respond within 24 hours.",
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
