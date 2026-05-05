import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import pool from "../config/db.js";
import { authenticate } from "../middleware/auth.js";
import { sendWelcomeEmail } from "../services/email.service.js";

const router = express.Router();

// POST /api/auth/register
router.post(
  "/register",
  [
    body("first_name").trim().notEmpty().withMessage("First name is required."),
    body("last_name").trim().notEmpty().withMessage("Last name is required."),
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email is required."),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters."),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

      const { first_name, last_name, email, password, phone, country } =
        req.body;

      const existing = await pool.query(
        "SELECT id FROM users WHERE email = $1",
        [email],
      );
      if (existing.rows.length) {
        return res
          .status(409)
          .json({ error: "An account with this email already exists." });
      }

      const password_hash = await bcrypt.hash(password, 12);
      const loyalty_number = `FCL${Date.now().toString().slice(-8)}`;

      const { rows } = await pool.query(
        `INSERT INTO users (first_name, last_name, email, password_hash, phone, country, loyalty_number)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, first_name, last_name, email, role, loyalty_number, loyalty_tier, loyalty_points`,
        [
          first_name,
          last_name,
          email,
          password_hash,
          phone || null,
          country || null,
          loyalty_number,
        ],
      );

      const user = rows[0];
      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      });

      try {
        await sendWelcomeEmail(user);
      } catch (_) {}

      res.status(201).json({ token, user });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/auth/login
router.post(
  "/login",
  [body("email").isEmail().normalizeEmail(), body("password").notEmpty()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

      const { email, password } = req.body;
      const { rows } = await pool.query(
        "SELECT id, first_name, last_name, email, password_hash, role, loyalty_tier, loyalty_points, loyalty_number FROM users WHERE email = $1",
        [email],
      );

      if (!rows.length)
        return res.status(401).json({ error: "Invalid email or password." });

      const user = rows[0];
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid)
        return res.status(401).json({ error: "Invalid email or password." });

      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      });
      const { password_hash: _, ...safeUser } = user;

      res.json({ token, user: safeUser });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/auth/me
router.get("/me", authenticate, async (req, res) => {
  res.json({ user: req.user });
});

// PUT /api/auth/me — update own profile
router.put("/me", authenticate, async (req, res, next) => {
  try {
    const { first_name, last_name, phone, country } = req.body;
    const { rows } = await pool.query(
      `UPDATE users
       SET first_name = COALESCE($1, first_name),
           last_name  = COALESCE($2, last_name),
           phone      = COALESCE($3, phone),
           country    = COALESCE($4, country),
           updated_at = NOW()
       WHERE id = $5
       RETURNING id, first_name, last_name, email, phone, country,
                 role, loyalty_tier, loyalty_points, loyalty_number`,
      [
        first_name || null,
        last_name || null,
        phone || null,
        country || null,
        req.user.id,
      ],
    );
    res.json({ user: rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
