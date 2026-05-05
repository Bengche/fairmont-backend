import express from "express";
import { body, validationResult } from "express-validator";
import pool from "../config/db.js";
import { sendNewsletterWelcome } from "../services/email.service.js";

const router = express.Router();

router.post(
  "/subscribe",
  [body("email").isEmail().normalizeEmail()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

      const { email } = req.body;
      const existing = await pool.query(
        "SELECT id FROM newsletter_subscribers WHERE email = $1",
        [email],
      );
      if (existing.rows.length) {
        return res.json({ message: "You are already subscribed." });
      }

      await pool.query(
        "INSERT INTO newsletter_subscribers (email) VALUES ($1)",
        [email],
      );
      try {
        await sendNewsletterWelcome(email);
      } catch (_) {}
      res.json({ message: "You have been subscribed successfully." });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
