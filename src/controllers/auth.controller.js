/**
 * Authentication controller.
 * Responsibilities:
 * - Validate presence of required inputs (primary validation occurs in validators middleware)
 * - Delegate all authentication business logic to services
 * - Set and clear refresh token cookies in a secure, environment-aware way
 */
import environment from '../config/environment.js';
import ApiError from '../utils/ApiError.js';
import ERROR_CODES from '../constants/errorCodes.js';
import { formatSuccessResponse } from '../utils/responseFormatter.js';
import authService from '../services/auth/authService.js';
import auditLogService from '../services/auditLog.service.js';

const buildRefreshCookieOptions = ({ expiresAt }) => ({
  httpOnly: true,
  secure: environment.runtime.isProduction,
  sameSite: environment.runtime.isProduction ? 'strict' : 'lax',
  path: `${environment.app.apiBasePath}/${environment.app.apiVersion}/auth`,
  expires: expiresAt,
});

const setRefreshCookie = (response, { refreshToken, refreshExpiresAt }) => {
  response.cookie('refreshToken', refreshToken, buildRefreshCookieOptions({ expiresAt: refreshExpiresAt }));
};

const clearRefreshCookie = (response) => {
  response.clearCookie('refreshToken', {
    path: `${environment.app.apiBasePath}/${environment.app.apiVersion}/auth`,
  });
};

const googleLogin = async (request, response) => {
  const { idToken, device } = request.body || {};
  const ip = request.ip;

  const data = await authService.googleLogin({ idToken, device, ip });
  setRefreshCookie(response, data.tokens);

  auditLogService
    .createAuditLog({
      actorType: 'user',
      actorUserId: data?.user?.id || null,
      action: 'AUTH_LOGIN',
      targetType: 'User',
      targetId: data?.user?.id || null,
      ip,
      userAgent: request.headers['user-agent'] || null,
      requestId: request.requestId || null,
      path: request.originalUrl,
      method: request.method,
      metadata: { provider: 'google', device: device || null },
    })
    .catch(() => null);

  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const refresh = async (request, response) => {
  const refreshToken = request.cookies?.refreshToken || request.body?.refreshToken;
  if (!refreshToken) {
    throw new ApiError(401, 'Missing refresh token.', { code: 'REFRESH_TOKEN_MISSING' });
  }

  const ip = request.ip;
  const data = await authService.refreshTokens({ refreshToken, ip });
  setRefreshCookie(response, data.tokens);

  auditLogService
    .createAuditLog({
      actorType: request.user?.id ? 'user' : 'system',
      actorUserId: request.user?.id || null,
      action: 'AUTH_REFRESH',
      targetType: 'RefreshToken',
      targetId: null,
      ip,
      userAgent: request.headers['user-agent'] || null,
      requestId: request.requestId || null,
      path: request.originalUrl,
      method: request.method,
      metadata: {},
    })
    .catch(() => null);

  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const logout = async (request, response) => {
  const refreshToken = request.cookies?.refreshToken || request.body?.refreshToken;
  if (!refreshToken) {
    clearRefreshCookie(response);
    response.status(200).json(formatSuccessResponse({ statusCode: 200, data: { loggedOut: true } }));
    return;
  }

  await authService.logout({ refreshToken });
  clearRefreshCookie(response);

  auditLogService
    .createAuditLog({
      actorType: request.user?.id ? 'user' : 'system',
      actorUserId: request.user?.id || null,
      action: 'AUTH_LOGOUT',
      targetType: 'RefreshToken',
      targetId: null,
      ip: request.ip,
      userAgent: request.headers['user-agent'] || null,
      requestId: request.requestId || null,
      path: request.originalUrl,
      method: request.method,
      metadata: {},
    })
    .catch(() => null);

  response.status(200).json(formatSuccessResponse({ statusCode: 200, data: { loggedOut: true } }));
};

const logoutAll = async (request, response) => {
  if (!request.user?.id) {
    throw new ApiError(null, null, { code: ERROR_CODES.AUTH_001 });
  }

  await authService.logoutAll({ userId: request.user.id });
  clearRefreshCookie(response);

  auditLogService
    .createAuditLog({
      actorType: 'user',
      actorUserId: request.user.id,
      action: 'AUTH_LOGOUT_ALL',
      targetType: 'User',
      targetId: request.user.id,
      ip: request.ip,
      userAgent: request.headers['user-agent'] || null,
      requestId: request.requestId || null,
      path: request.originalUrl,
      method: request.method,
      metadata: {},
    })
    .catch(() => null);

  response.status(200).json(formatSuccessResponse({ statusCode: 200, data: { loggedOutAll: true } }));
};

const me = async (request, response) => {
  if (!request.user?.id) {
    throw new ApiError(null, null, { code: ERROR_CODES.AUTH_001 });
  }

  const data = await authService.getMe({ userId: request.user.id });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

export { googleLogin, refresh, logout, logoutAll, me };
