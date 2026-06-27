/**
 * Centralized error handling middleware.
 * It normalizes operational and unexpected errors into API-safe responses.
 */
import environment from "../config/environment.js";
import { errorLogger } from "../config/logger.js";
import { formatErrorResponse } from "../utils/responseFormatter.js";

const errorHandler = (error, request, response, _next) => {
  const statusCode = error.statusCode || 500;

  errorLogger.error(error.message || "Unhandled application error.", {
    code: error.code || "UNHANDLED_ERROR",
    path: request.originalUrl,
    method: request.method,
    stack: error.stack,
    details: error.details || null,
  });

  response.status(statusCode).json(
    formatErrorResponse({
      statusCode,
      message: error.message || "Internal server error.",
      error: {
        code: error.code || "INTERNAL_SERVER_ERROR",
        details: error.details || null,
        stack: environment.runtime.isDevelopment ? error.stack : undefined,
      },
    }),
  );
};

export default errorHandler;
