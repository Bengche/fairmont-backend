export const errorHandler = (err, req, res, next) => {
  console.error("[Error]", err.message);

  if (err.message && err.message.includes("Only PDF")) {
    return res.status(400).json({ error: err.message });
  }

  if (err.code === "23505") {
    return res
      .status(409)
      .json({ error: "A record with this value already exists." });
  }

  if (err.code === "23503") {
    return res.status(400).json({ error: "Referenced record does not exist." });
  }

  const status = err.status || err.statusCode || 500;
  const message =
    process.env.NODE_ENV === "production"
      ? "An unexpected error occurred."
      : err.message || "An unexpected error occurred.";

  res.status(status).json({ error: message });
};
