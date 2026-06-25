/**
 * Standardized application error object for predictable error handling.
 * Controllers and middleware can throw this to preserve HTTP semantics.
 */
class ApiError extends Error {
  constructor(statusCode, message, options = {}) {
    super(message);

    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.isOperational = options.isOperational ?? true;
    this.code = options.code || null;
    this.details = options.details || null;

    Error.captureStackTrace?.(this, this.constructor);
  }
}

export default ApiError;
