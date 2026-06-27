/**
 * Fallback middleware for unmatched routes.
 * It converts missing endpoints into a consistent API error.
 */
import ApiError from "../utils/ApiError.js";

const notFound = (request, response, next) => {
  next(
    new ApiError(
      404,
      `Route not found: ${request.method} ${request.originalUrl}`,
      {
        code: "ROUTE_NOT_FOUND",
      },
    ),
  );
};

export default notFound;
