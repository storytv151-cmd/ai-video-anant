/**
 * Session service manages refresh token persistence and revocation.
 * Refresh tokens are stored in MongoDB (hashed) to support rotation and logout flows.
 */
import RefreshTokenModel from '../../models/RefreshToken.js';
import ApiError from '../../utils/ApiError.js';
import tokenService from './tokenService.js';

const findActiveSessionByToken = async (refreshToken) => {
  const tokenHash = tokenService.hashToken(refreshToken);

  return RefreshTokenModel.findOne({
    token: tokenHash,
    revoked: false,
  });
};

const createRefreshSession = async ({ userId, deviceId, refreshToken, ip, expiresAt, session }) => {
  const tokenHash = tokenService.hashToken(refreshToken);

  const doc = await RefreshTokenModel.create(
    [
      {
        user: userId,
        token: tokenHash,
        device: deviceId || null,
        ip: ip || null,
        expiresAt,
        revoked: false,
      },
    ],
    session ? { session } : undefined,
  );

  return doc[0];
};

const revokeSessionByToken = async ({ refreshToken, reason = 'revoked', session }) => {
  const tokenHash = tokenService.hashToken(refreshToken);
  const update = {
    revoked: true,
    isDeleted: true,
    deletedAt: new Date(),
  };

  const result = await RefreshTokenModel.updateOne({ token: tokenHash }, update, session ? { session } : undefined);
  if (result.matchedCount === 0) {
    throw new ApiError(401, 'Refresh token not found or already revoked.', {
      code: 'REFRESH_TOKEN_REVOKED',
      details: [{ reason }],
    });
  }
};

const revokeAllSessionsForUser = async ({ userId, session }) => {
  await RefreshTokenModel.updateMany(
    { user: userId, revoked: false },
    { revoked: true, isDeleted: true, deletedAt: new Date() },
    session ? { session } : undefined,
  );
};

const sessionService = Object.freeze({
  findActiveSessionByToken,
  createRefreshSession,
  revokeSessionByToken,
  revokeAllSessionsForUser,
});

export default sessionService;
