import CreditTransactionModel from "../../models/CreditTransaction.js";
import UserModel from "../../models/User.js";
import WalletModel from "../../models/Wallet.js";
import ApiError from "../../utils/ApiError.js";
import {
  buildCreditTransactionDto,
  buildWalletDto,
} from "../../utils/wallet.dto.js";
import walletHistoryService from "../wallet/walletHistoryService.js";
import walletService from "../wallet/walletService.js";
import adminAuditService from "./adminAuditService.js";
import adminQueryService from "./adminQueryService.js";

const listWallets = async ({ query = {} } = {}) => {
  const { page, limit, skip } = adminQueryService.buildPagination({
    page: query.page,
    limit: query.limit,
    maxLimit: 100,
  });
  const walletFilter = {};
  if (query.status) {
    walletFilter.status = String(query.status).trim().toLowerCase();
  }
  if (query.userId) {
    walletFilter.user = query.userId;
  }

  if (query.search) {
    const userSearch = adminQueryService.buildRegexSearch(query.search);
    const users = await UserModel.find({
      $or: [
        { name: userSearch },
        { email: userSearch },
        { googleId: userSearch },
      ],
    })
      .select({ _id: 1 })
      .lean();
    walletFilter.user = { $in: users.map((item) => item._id) };
  }

  const [wallets, total] = await Promise.all([
    WalletModel.find(walletFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    WalletModel.countDocuments(walletFilter),
  ]);
  const users = await UserModel.find({
    _id: { $in: wallets.map((item) => item.user) },
  })
    .select({ name: 1, email: 1, role: 1, accountStatus: 1 })
    .lean();
  const userMap = new Map(users.map((user) => [String(user._id), user]));

  return adminQueryService.buildPaginatedResponse({
    items: wallets.map((wallet) => ({
      ...buildWalletDto(wallet),
      user: userMap.get(String(wallet.user)) || wallet.user,
    })),
    page,
    limit,
    total,
  });
};

const getWallet = async ({ userId } = {}) => {
  const wallet = await WalletModel.findOne({ user: userId }).lean();
  if (!wallet) {
    throw new ApiError(404, "Wallet not found.", { code: "WALLET_NOT_FOUND" });
  }
  const user = await UserModel.findById(userId)
    .select({ name: 1, email: 1, role: 1, accountStatus: 1 })
    .lean();
  return {
    ...buildWalletDto(wallet),
    user,
  };
};

const getWalletHistory = async ({ userId, query = {} } = {}) =>
  walletHistoryService.listHistory({
    userId,
    page: query.page,
    limit: query.limit,
    type: query.type,
    status: query.status,
    dateFrom: query.dateFrom || query.from,
    dateTo: query.dateTo || query.to,
    sort: query.sort,
  });

const searchTransactions = async ({ query = {} } = {}) => {
  const { page, limit, skip } = adminQueryService.buildPagination({
    page: query.page,
    limit: query.limit,
    maxLimit: 200,
  });
  const filter = {};
  if (query.userId) {
    filter.user = query.userId;
  }
  if (query.walletId) {
    filter.wallet = query.walletId;
  }
  if (query.type) {
    filter.type = String(query.type).trim().toLowerCase();
  }
  if (query.status) {
    filter.status = String(query.status).trim().toLowerCase();
  }
  if (query.source) {
    filter.source = String(query.source).trim();
  }
  const createdAt = adminQueryService.buildDateRange({
    from: query.dateFrom || query.from,
    to: query.dateTo || query.to,
  });
  if (createdAt) {
    filter.createdAt = createdAt;
  }

  const [items, total] = await Promise.all([
    CreditTransactionModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    CreditTransactionModel.countDocuments(filter),
  ]);
  return adminQueryService.buildPaginatedResponse({
    items: items.map(buildCreditTransactionDto),
    page,
    limit,
    total,
  });
};

const grantCredits = async ({
  userId,
  credits,
  description = null,
  adminUserId = null,
  request = null,
} = {}) => {
  const result = await walletService.addCredits({
    userId,
    credits: Number(credits),
    type: "admin",
    source: "Admin",
    purpose: "admin_wallet_grant",
    description: description || "Admin wallet grant.",
    referenceType: "Wallet",
    referenceId: null,
    idempotencyKey: request?.idempotencyKey || null,
  });

  await adminAuditService.logAdminAction({
    request,
    adminUserId,
    action: "ADMIN_WALLET_CREDITS_GRANTED",
    targetType: "User",
    targetId: userId,
    metadata: {
      credits: Number(credits),
      transactionId: result.transaction?._id || null,
    },
  });

  return result;
};

const deductCredits = async ({
  userId,
  credits,
  description = null,
  adminUserId = null,
  request = null,
} = {}) => {
  const result = await walletService.deductCredits({
    userId,
    credits: Number(credits),
    type: "admin",
    source: "Admin",
    purpose: "admin_wallet_deduct",
    description: description || "Admin wallet deduction.",
    referenceType: "Wallet",
    referenceId: null,
    idempotencyKey: request?.idempotencyKey || null,
  });

  await adminAuditService.logAdminAction({
    request,
    adminUserId,
    action: "ADMIN_WALLET_CREDITS_DEDUCTED",
    targetType: "User",
    targetId: userId,
    metadata: {
      credits: Number(credits),
      transactionId: result.transaction?._id || null,
    },
  });

  return result;
};

const refundCredits = async ({
  userId,
  credits,
  originalTransactionId = null,
  description = null,
  adminUserId = null,
  request = null,
} = {}) => {
  const result = await walletService.refundCredits({
    userId,
    credits: Number(credits),
    originalTransactionId,
    description: description || "Admin refund issued.",
    idempotencyKey: request?.idempotencyKey || null,
  });

  await adminAuditService.logAdminAction({
    request,
    adminUserId,
    action: "ADMIN_WALLET_REFUND_ISSUED",
    targetType: "User",
    targetId: userId,
    metadata: {
      credits: Number(credits),
      originalTransactionId,
      transactionId: result.transaction?._id || null,
    },
  });

  return result;
};

const updateWalletStatus = async ({
  userId,
  status,
  adminUserId = null,
  request = null,
} = {}) => {
  const wallet = await WalletModel.findOne({ user: userId });
  if (!wallet) {
    throw new ApiError(404, "Wallet not found.", { code: "WALLET_NOT_FOUND" });
  }
  wallet.status = String(status || "")
    .trim()
    .toLowerCase();
  await wallet.save();

  await adminAuditService.logAdminAction({
    request,
    adminUserId,
    action: "ADMIN_WALLET_STATUS_UPDATED",
    targetType: "Wallet",
    targetId: wallet._id,
    metadata: { userId, status: wallet.status },
  });

  return buildWalletDto(wallet.toObject());
};

const adminWalletService = Object.freeze({
  listWallets,
  getWallet,
  getWalletHistory,
  searchTransactions,
  grantCredits,
  deductCredits,
  refundCredits,
  updateWalletStatus,
});

export default adminWalletService;
