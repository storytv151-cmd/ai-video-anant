/**
 * Authentication middleware placeholders for future security phases.
 * The current foundation intentionally avoids implementing auth behavior.
 */
import ApiError from '../utils/ApiError.js';

const requireAuth = async (request, response, next) => {
  next(
    new ApiError(501, 'Authentication is not implemented in Phase-1.', {
      code: 'AUTH_NOT_IMPLEMENTED',
    }),
  );
};

const optionalAuth = async (request, response, next) => {
  request.user = null;
  next();
};

export { requireAuth, optionalAuth };
