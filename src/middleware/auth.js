/**
 * Authentication and authorization middleware.
 * This module supports access tokens from Authorization headers and prepares the
 * foundation for future web and mobile clients.
 */
import ApiError from '../utils/ApiError.js';
import UserModel from '../models/User.js';
import tokenService from '../services/auth/tokenService.js';

const extractBearerToken = (request) => {
  const header = request.headers?.authorization || request.headers?.Authorization;
  if (!header || typeof header !== 'string') {
    return null;
  }

  const [scheme, value] = header.split(' ');
  if (!scheme || !value) {
    return null;
  }

  if (scheme.toLowerCase() !== 'bearer') {
    return null;
  }

  return value.trim();
};

const authenticate = async (request, response, next) => {
  try {
    const token = extractBearerToken(request);
    if (!token) {
      next(new ApiError(401, 'Missing access token.', { code: 'ACCESS_TOKEN_MISSING' }));
      return;
    }

    const payload = tokenService.verifyAccessToken(token);
    const user = await UserModel.findById(payload.sub);
    if (!user) {
      next(new ApiError(401, 'Invalid access token.', { code: 'ACCESS_TOKEN_INVALID' }));
      return;
    }

    if (user.accountStatus !== 'active') {
      next(new ApiError(403, 'User is not allowed to access this resource.', { code: 'USER_SUSPENDED' }));
      return;
    }

    request.user = {
      id: String(user._id),
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

const optionalAuth = async (request, response, next) => {
  try {
    const token = extractBearerToken(request);
    if (!token) {
      request.user = null;
      next();
      return;
    }

    const payload = tokenService.verifyAccessToken(token);
    const user = await UserModel.findById(payload.sub);
    if (!user || user.accountStatus !== 'active') {
      request.user = null;
      next();
      return;
    }

    request.user = { id: String(user._id), role: user.role };
    next();
  } catch {
    request.user = null;
    next();
  }
};

const authorize =
  (...roles) =>
  async (request, response, next) => {
    if (!request.user) {
      next(new ApiError(401, 'Authentication required.', { code: 'AUTH_REQUIRED' }));
      return;
    }

    if (roles.length > 0 && !roles.includes(request.user.role)) {
      next(new ApiError(403, 'Not authorized.', { code: 'FORBIDDEN' }));
      return;
    }

    next();
  };

const requireAuth = authenticate;

export { authenticate, requireAuth, optionalAuth, authorize };
