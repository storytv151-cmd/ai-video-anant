/**
 * Reward controller.
 * Thin controller that delegates reward logic to the reward service.
 */
import { formatSuccessResponse } from "../utils/responseFormatter.js";
import ApiError from "../utils/ApiError.js";
import ERROR_CODES from "../constants/errorCodes.js";
import rewardService from "../services/wallet/rewardService.js";
import auditLogService from "../services/auditLog.service.js";

const claimDailyBonus = async (request, response) => {
  if (!request.user?.id) {
    throw new ApiError(null, null, { code: ERROR_CODES.AUTH_001 });
  }

  const data = await rewardService.claimDailyBonus({
    userId: request.user.id,
    idempotencyKey: request.idempotencyKey,
  });

  auditLogService
    .createAuditLog({
      actorType: "user",
      actorUserId: request.user.id,
      action: "WALLET_REWARD_DAILY",
      targetType: "Wallet",
      targetId: null,
      ip: request.ip,
      userAgent: request.headers["user-agent"] || null,
      requestId: request.requestId || null,
      path: request.originalUrl,
      method: request.method,
      metadata: {
        idempotencyKey: request.idempotencyKey || null,
        credits: data?.transaction?.credits || null,
      },
    })
    .catch(() => null);

  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const claimRewardAd = async (request, response) => {
  if (!request.user?.id) {
    throw new ApiError(null, null, { code: ERROR_CODES.AUTH_001 });
  }

  const data = await rewardService.claimRewardAd({
    userId: request.user.id,
    idempotencyKey: request.idempotencyKey,
  });

  auditLogService
    .createAuditLog({
      actorType: "user",
      actorUserId: request.user.id,
      action: "WALLET_REWARD_AD",
      targetType: "Wallet",
      targetId: null,
      ip: request.ip,
      userAgent: request.headers["user-agent"] || null,
      requestId: request.requestId || null,
      path: request.originalUrl,
      method: request.method,
      metadata: {
        idempotencyKey: request.idempotencyKey || null,
        credits: data?.transaction?.credits || null,
      },
    })
    .catch(() => null);

  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

export { claimDailyBonus, claimRewardAd };
