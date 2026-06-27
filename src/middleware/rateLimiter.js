/**
 * Global API rate limiter middleware.
 * It protects the platform foundation from abusive traffic and burst overload.
 */
import rateLimit from "express-rate-limit";
import environment from "../config/environment.js";

const rateLimiter = rateLimit({
  windowMs: environment.rateLimit.windowMs,
  limit: environment.rateLimit.maxRequests,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

export default rateLimiter;
