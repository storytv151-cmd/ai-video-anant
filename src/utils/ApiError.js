/**
 * Standardized application error object for predictable error handling.
 * Controllers and middleware can throw this to preserve HTTP semantics.
 */
import { ERROR_CATALOG } from "../constants/errorCodes.js";

class ApiError extends Error {
  constructor(statusCode, message, options = {}) {
    const resolved = options.code ? ERROR_CATALOG[options.code] : null;
    const resolvedMessage = message || resolved?.message || "Error";
    super(resolvedMessage);

    this.name = "ApiError";
    this.statusCode = statusCode || resolved?.statusCode || 500;
    this.isOperational = options.isOperational ?? true;
    this.code = options.code || null;
    this.details = options.details || null;

    Error.captureStackTrace?.(this, this.constructor);
  }
}

export default ApiError;
