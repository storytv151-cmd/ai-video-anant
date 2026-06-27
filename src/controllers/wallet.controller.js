/**
 * Wallet controller.
 * Thin controller that delegates all business logic to wallet services.
 */
import { formatSuccessResponse } from "../utils/responseFormatter.js";
import ApiError from "../utils/ApiError.js";
import ERROR_CODES from "../constants/errorCodes.js";
import walletService from "../services/wallet/walletService.js";
import walletHistoryService from "../services/wallet/walletHistoryService.js";
import rewardService from "../services/wallet/rewardService.js";
import auditLogService from "../services/auditLog.service.js";

const getWallet = async (request, response) => {
  if (!request.user?.id) {
    throw new ApiError(null, null, { code: ERROR_CODES.AUTH_001 });
  }

  const wallet = await walletService.getWalletByUser({
    userId: request.user.id,
  });
  response
    .status(200)
    .json(
      formatSuccessResponse({
        statusCode: 200,
        data: walletService.buildWalletResponse(wallet),
      }),
    );
};

const getWalletHistory = async (request, response) => {
  if (!request.user?.id) {
    throw new ApiError(null, null, { code: ERROR_CODES.AUTH_001 });
  }

  const data = await walletHistoryService.listHistory({
    userId: request.user.id,
    page: request.query.page,
    limit: request.query.limit,
    type: request.query.type,
    status: request.query.status,
    dateFrom: request.query.dateFrom,
    dateTo: request.query.dateTo,
    sort: request.query.sort,
  });

  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const getWalletSummary = async (request, response) => {
  if (!request.user?.id) {
    throw new ApiError(null, null, { code: ERROR_CODES.AUTH_001 });
  }

  const data = await walletHistoryService.buildSummary({
    userId: request.user.id,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const redeemPromo = async (request, response) => {
  if (!request.user?.id) {
    throw new ApiError(null, null, { code: ERROR_CODES.AUTH_001 });
  }

  const { code } = request.body || {};
  const data = await rewardService.redeemPromoCode({
    userId: request.user.id,
    code,
    idempotencyKey: request.idempotencyKey,
  });

  auditLogService
    .createAuditLog({
      actorType: "user",
      actorUserId: request.user.id,
      action: "WALLET_PROMO_REDEEM",
      targetType: "Coupon",
      targetId: code || null,
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

export { getWallet, getWalletHistory, getWalletSummary, redeemPromo };
