import { authenticate } from "./auth.js";

export const adminAuth = async (req, res, next) => {
  await authenticate(req, res, async () => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required." });
    }
    next();
  });
};
