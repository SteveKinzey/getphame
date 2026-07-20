import type { RequestHandler } from "express";

/** Keep every unmatched API request out of the Vite/SPA HTML fallback. */
export const apiNotFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    error: "API endpoint not found.",
    path: req.originalUrl,
  });
};
