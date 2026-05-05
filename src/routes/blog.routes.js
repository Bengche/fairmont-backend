import express from "express";
import pool from "../config/db.js";

const router = express.Router();

// GET /api/blog
router.get("/", async (req, res, next) => {
  try {
    const { category, limit = 10, offset = 0 } = req.query;
    let query = `
      SELECT bp.id, bp.title, bp.slug, bp.excerpt, bp.category, bp.tags,
             bp.cover_image, bp.published_at,
             u.first_name || ' ' || u.last_name as author_name
      FROM blog_posts bp
      LEFT JOIN users u ON bp.author_id = u.id
      WHERE bp.is_published = true
    `;
    const params = [];
    let idx = 1;

    if (category) {
      query += ` AND bp.category = $${idx++}`;
      params.push(category);
    }

    query += ` ORDER BY bp.published_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(Number(limit), Number(offset));

    const { rows } = await pool.query(query, params);
    res.json({ posts: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/blog/:slug
router.get("/:slug", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT bp.*, u.first_name || ' ' || u.last_name as author_name
      FROM blog_posts bp
      LEFT JOIN users u ON bp.author_id = u.id
      WHERE bp.slug = $1 AND bp.is_published = true
    `,
      [req.params.slug],
    );
    if (!rows.length) return res.status(404).json({ error: "Post not found." });
    res.json({ post: rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
