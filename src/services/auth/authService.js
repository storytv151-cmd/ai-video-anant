/**
 * Authentication service orchestrates Google login, token rotation, logout, and current-user retrieval.
 * Controllers should remain thin and call these methods.
 */
import AppSettingModel from "../../models/AppSetting.js";
import UserModel from "../../models/User.js";
import UserDeviceModel from "../../models/UserDevice.js";
import ApiError from "../../utils/ApiError.js";
import googleService from "./googleService.js";
import sessionService from "./sessionService.js";
import tokenService from "./tokenService.js";
import walletBootstrapService from "./walletBootstrapService.js";

const getSystemSettings = async () => {
  const systemDoc =
    (await AppSettingModel.findOne({ section: "SYSTEM", key: "global" })) ||
    (await AppSettingModel.findOne({ section: "GENERAL", key: "global" }));

  return systemDoc || null;
};

const assertSystemAllowsLogin = async ({ isNewUser }) => {
  const settings = await getSystemSettings();

  if (settings?.maintenanceMode === true) {
    throw new ApiError(503, "System is under maintenance.", {
      code: "MAINTENANCE_MODE",
    });
  }

  if (settings?.googleLoginEnabled === false) {
    throw new ApiError(403, "Google login is disabled.", {
      code: "GOOGLE_LOGIN_DISABLED",
    });
  }

  if (isNewUser && settings?.registrationEnabled === false) {
    throw new ApiError(403, "Registration is disabled.", {
      code: "REGISTRATION_DISABLED",
    });
  }
};

const upsertUserDevice = async ({ userId, device, session }) => {
  const now = new Date();
  const update = {
    platform: device.platform,
    appVersion: device.appVersion || null,
    model: device.model || null,
    osVersion: device.osVersion || null,
    pushToken: device.pushToken || null,
    lastLogin: now,
    active: true,
  };

  return UserDeviceModel.findOneAndUpdate(
    { user: userId, deviceId: device.deviceId },
    { $set: update, $setOnInsert: { user: userId, deviceId: device.deviceId } },
    { upsert: true, new: true, setDefaultsOnInsert: true, session },
  );
};

const buildAuthResponse = async ({ userId }) => {
  const user = await UserModel.findById(userId).populate("wallet");
  if (!user) {
    throw new ApiError(404, "User not found.", { code: "USER_NOT_FOUND" });
  }

  return {
    user,
    wallet: user.wallet || null,
  };
};

const googleLogin = async ({ idToken, device, ip }) => {
  const profile = await googleService.verifyIdToken(idToken);

  const existingUser = await UserModel.findOne({
    $or: [{ googleId: profile.googleId }, { email: profile.email }],
  });

  await assertSystemAllowsLogin({ isNewUser: !existingUser });

  const now = new Date();

  const result = await walletBootstrapService.withTransaction(
    async (session) => {
      let user = existingUser;

      if (!user) {
        const created = await UserModel.create(
          [
            {
              googleId: profile.googleId,
              name: profile.name,
              email: profile.email,
              profileImage: profile.picture,
              isEmailVerified: profile.emailVerified,
              lastLogin: now,
              lastActiveAt: now,
            },
          ],
          { session },
        );
        user = created[0];
      } else {
        if (user.accountStatus !== "active") {
          throw new ApiError(403, "User is not allowed to login.", {
            code: "USER_SUSPENDED",
          });
        }

        user.googleId = profile.googleId;
        user.name = profile.name || user.name;
        user.profileImage = profile.picture || user.profileImage;
        user.email = profile.email || user.email;
        user.isEmailVerified = profile.emailVerified || user.isEmailVerified;
        user.lastLogin = now;
        user.lastActiveAt = now;
        await user.save({ session });
      }

      const wallet = await walletBootstrapService.ensureWalletForUser({
        user,
        session,
      });
      const deviceDoc = await upsertUserDevice({
        userId: user._id,
        device,
        session,
      });

      if (!existingUser) {
        await walletBootstrapService.applyWelcomeBonusIfEligible({
          user,
          wallet,
          createdBy: null,
          session,
        });
      }

      const access = tokenService.generateAccessToken({
        userId: user._id,
        role: user.role,
      });
      const refresh = tokenService.generateRefreshToken({
        userId: user._id,
        deviceId: deviceDoc._id,
      });

      await sessionService.createRefreshSession({
        userId: user._id,
        deviceId: deviceDoc._id,
        refreshToken: refresh.token,
        ip,
        expiresAt: new Date(refresh.payload.exp * 1000),
        session,
      });

      return {
        userId: user._id,
        accessToken: access.token,
        accessExpiresAt: new Date(access.payload.exp * 1000),
        refreshToken: refresh.token,
        refreshExpiresAt: new Date(refresh.payload.exp * 1000),
      };
    },
  );

  return {
    ...(await buildAuthResponse({ userId: result.userId })),
    tokens: {
      accessToken: result.accessToken,
      accessExpiresAt: result.accessExpiresAt,
      refreshToken: result.refreshToken,
      refreshExpiresAt: result.refreshExpiresAt,
    },
  };
};

const refreshTokens = async ({ refreshToken, ip }) => {
  const payload = tokenService.verifyRefreshToken(refreshToken);

  const existingSession =
    await sessionService.findActiveSessionByToken(refreshToken);
  if (!existingSession) {
    throw new ApiError(401, "Refresh token revoked.", {
      code: "REFRESH_TOKEN_REVOKED",
    });
  }

  const userId = payload.sub;

  const user = await UserModel.findById(userId);
  if (!user) {
    throw new ApiError(401, "User not found for refresh token.", {
      code: "USER_NOT_FOUND",
    });
  }
  if (user.accountStatus !== "active") {
    throw new ApiError(403, "User is not allowed to refresh tokens.", {
      code: "USER_SUSPENDED",
    });
  }

  const access = tokenService.generateAccessToken({ userId, role: user.role });
  const refresh = tokenService.generateRefreshToken({
    userId,
    deviceId: payload.deviceId,
  });

  await walletBootstrapService.withTransaction(async (session) => {
    await sessionService.revokeSessionByToken({
      refreshToken,
      reason: "rotated",
      session,
    });
    await sessionService.createRefreshSession({
      userId,
      deviceId: existingSession.device || payload.deviceId || null,
      refreshToken: refresh.token,
      ip,
      expiresAt: new Date(refresh.payload.exp * 1000),
      session,
    });
  });

  return {
    tokens: {
      accessToken: access.token,
      accessExpiresAt: new Date(access.payload.exp * 1000),
      refreshToken: refresh.token,
      refreshExpiresAt: new Date(refresh.payload.exp * 1000),
    },
  };
};

const logout = async ({ refreshToken }) => {
  tokenService.verifyRefreshToken(refreshToken);
  await walletBootstrapService.withTransaction(async (session) => {
    await sessionService.revokeSessionByToken({
      refreshToken,
      reason: "logout",
      session,
    });
  });
};

const logoutAll = async ({ userId }) => {
  await walletBootstrapService.withTransaction(async (session) => {
    await sessionService.revokeAllSessionsForUser({ userId, session });
  });
};

const getMe = async ({ userId }) => buildAuthResponse({ userId });

const authService = Object.freeze({
  googleLogin,
  refreshTokens,
  logout,
  logoutAll,
  getMe,
});

export default authService;
