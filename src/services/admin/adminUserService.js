import PaymentModel from '../../models/Payment.js';
import RefreshTokenModel from '../../models/RefreshToken.js';
import UserDeviceModel from '../../models/UserDevice.js';
import UserModel from '../../models/User.js';
import VideoGenerationJobModel from '../../models/VideoGenerationJob.js';
import WalletModel from '../../models/Wallet.js';
import ApiError from '../../utils/ApiError.js';
import { buildPaymentDto } from '../../utils/payment.dto.js';
import { buildUserDto } from '../../utils/user.dto.js';
import { buildWalletDto } from '../../utils/wallet.dto.js';
import subscriptionService from '../subscription/subscriptionService.js';
import walletService from '../wallet/walletService.js';
import adminAuditService from './adminAuditService.js';
import adminQueryService from './adminQueryService.js';
import adminRoleService from './adminRoleService.js';

const USER_PROJECTION = Object.freeze({
  name: 1,
  email: 1,
  googleId: 1,
  profileImage: 1,
  country: 1,
  language: 1,
  role: 1,
  accountStatus: 1,
  isEmailVerified: 1,
  lastLogin: 1,
  lastActiveAt: 1,
  wallet: 1,
  subscription: 1,
  metadata: 1,
  createdAt: 1,
  updatedAt: 1,
  isDeleted: 1,
  deletedAt: 1,
});

const GENERATION_PROJECTION = Object.freeze({
  provider: 1,
  template: 1,
  generationType: 1,
  outputType: 1,
  status: 1,
  providerJobId: 1,
  queuePosition: 1,
  creditsCharged: 1,
  creditsReserved: 1,
  createdAt: 1,
  updatedAt: 1,
  completedAt: 1,
  failedAt: 1,
});

const findUserById = async ({ userId, withDeleted = true } = {}) => {
  let query = UserModel.findById(userId).select(USER_PROJECTION);
  if (withDeleted) {
    query = query.withDeleted();
  }
  const user = await query;
  if (!user) {
    throw new ApiError(404, 'User not found.', { code: 'USER_NOT_FOUND' });
  }
  return user;
};

const mapAdminUserSummary = ({ user, wallet = null } = {}) => ({
  ...buildUserDto(user),
  wallet: buildWalletDto(wallet),
  isDeleted: Boolean(user?.isDeleted),
  deletedAt: user?.deletedAt || null,
});

const listUsers = async ({ query = {} } = {}) => {
  const { page, limit, skip } = adminQueryService.buildPagination({
    page: query.page,
    limit: query.limit,
    maxLimit: 100,
  });
  const filter = {};

  if (query.accountStatus) {
    filter.accountStatus = String(query.accountStatus).trim().toLowerCase();
  }
  if (query.role) {
    filter.role = String(query.role).trim().toLowerCase();
  }
  if (query.country) {
    filter.country = String(query.country).trim().toUpperCase();
  }
  if (adminQueryService.parseBoolean(query.deletedOnly, false)) {
    filter.isDeleted = true;
  }

  const createdAt = adminQueryService.buildDateRange({
    from: query.dateFrom || query.from,
    to: query.dateTo || query.to,
  });
  if (createdAt) {
    filter.createdAt = createdAt;
  }

  const searchRegex = adminQueryService.buildRegexSearch(query.search);
  if (searchRegex) {
    filter.$or = [{ name: searchRegex }, { email: searchRegex }, { googleId: searchRegex }];
  }

  let userQuery = UserModel.find(filter)
    .select(USER_PROJECTION)
    .sort({ createdAt: adminQueryService.normalizeSortDirection(query.sort) })
    .skip(skip)
    .limit(limit);
  let countQuery = UserModel.countDocuments(filter);

  if (adminQueryService.parseBoolean(query.includeDeleted, false) || filter.isDeleted === true) {
    userQuery = userQuery.withDeleted();
    countQuery = UserModel.countDocuments(filter).setOptions({ withDeleted: true });
  }

  const [users, total] = await Promise.all([userQuery.lean(), countQuery]);
  const wallets = await WalletModel.find({ user: { $in: users.map((item) => item._id) } }).lean();
  const walletMap = new Map(wallets.map((wallet) => [String(wallet.user), wallet]));

  return adminQueryService.buildPaginatedResponse({
    items: users.map((user) =>
      mapAdminUserSummary({
        user,
        wallet: walletMap.get(String(user._id)) || null,
      }),
    ),
    page,
    limit,
    total,
  });
};

const getUserDetail = async ({ userId } = {}) => {
  const user = await findUserById({ userId, withDeleted: true });
  const wallet = await WalletModel.findOne({ user: user._id }).lean();
  return mapAdminUserSummary({ user, wallet });
};

const updateUserStatus = async ({ userId, status, reason = null, adminUserId = null, request = null } = {}) => {
  const user = await findUserById({ userId, withDeleted: true });
  user.accountStatus = String(status || '').trim().toLowerCase();
  await user.save();

  await adminAuditService.logAdminAction({
    request,
    adminUserId,
    action: 'ADMIN_USER_STATUS_UPDATED',
    targetType: 'User',
    targetId: user._id,
    metadata: { status: user.accountStatus, reason },
  });

  return buildUserDto(user.toObject());
};

const assignRole = async ({
  userId,
  role,
  adminRoleCode = null,
  reason = null,
  adminUserId = null,
  request = null,
} = {}) => {
  const user = await findUserById({ userId, withDeleted: true });
  const resolved = await adminRoleService.resolveUserRoleAssignment({ role, adminRoleCode });

  user.role = resolved.role;
  const metadata =
    user.metadata instanceof Map ? Object.fromEntries(user.metadata.entries()) : user.metadata || {};
  if (resolved.adminRoleCode) {
    metadata.adminRoleCode = resolved.adminRoleCode;
  } else {
    delete metadata.adminRoleCode;
  }
  user.metadata = metadata;
  await user.save();

  await adminAuditService.logAdminAction({
    request,
    adminUserId,
    action: 'ADMIN_USER_ROLE_ASSIGNED',
    targetType: 'User',
    targetId: user._id,
    metadata: {
      role: resolved.role,
      adminRoleCode: resolved.adminRoleCode,
      reason,
    },
  });

  return buildUserDto(user.toObject());
};

const listUserDevices = async ({ userId } = {}) => {
  await findUserById({ userId, withDeleted: true });
  const items = await UserDeviceModel.find({ user: userId }).sort({ lastLogin: -1, createdAt: -1 }).lean();
  return { items };
};

const listUserLoginHistory = async ({ userId, query = {} } = {}) => {
  await findUserById({ userId, withDeleted: true });
  const { page, limit, skip } = adminQueryService.buildPagination({
    page: query.page,
    limit: query.limit,
    maxLimit: 100,
  });

  const filter = { user: userId };
  const [items, total] = await Promise.all([
    RefreshTokenModel.find(filter)
      .populate({ path: 'device', model: 'UserDevice', select: { deviceId: 1, platform: 1, model: 1, osVersion: 1, lastLogin: 1 } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    RefreshTokenModel.countDocuments(filter),
  ]);

  return adminQueryService.buildPaginatedResponse({ items, page, limit, total });
};

const listUserGenerationHistory = async ({ userId, query = {} } = {}) => {
  await findUserById({ userId, withDeleted: true });
  const { page, limit, skip } = adminQueryService.buildPagination({
    page: query.page,
    limit: query.limit,
    maxLimit: 100,
  });
  const filter = { user: userId };
  if (query.status) {
    filter.status = String(query.status).trim().toLowerCase();
  }
  const [items, total] = await Promise.all([
    VideoGenerationJobModel.find(filter)
      .select(GENERATION_PROJECTION)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    VideoGenerationJobModel.countDocuments(filter),
  ]);

  return adminQueryService.buildPaginatedResponse({ items, page, limit, total });
};

const listUserPayments = async ({ userId, query = {} } = {}) => {
  await findUserById({ userId, withDeleted: true });
  const { page, limit, skip } = adminQueryService.buildPagination({
    page: query.page,
    limit: query.limit,
    maxLimit: 100,
  });
  const filter = { user: userId };
  if (query.status) {
    filter.status = String(query.status).trim().toLowerCase();
  }

  const [items, total] = await Promise.all([
    PaymentModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    PaymentModel.countDocuments(filter),
  ]);

  return adminQueryService.buildPaginatedResponse({
    items: items.map(buildPaymentDto),
    page,
    limit,
    total,
  });
};

const getUserSubscriptionView = async ({ userId, query = {} } = {}) => {
  await findUserById({ userId, withDeleted: true });
  const [current, history] = await Promise.all([
    subscriptionService.buildCurrentSubscriptionResponse({ userId }),
    subscriptionService.getSubscriptionHistory({ userId, query }),
  ]);
  return { current, history };
};

const grantCredits = async ({
  userId,
  credits,
  description = null,
  adminUserId = null,
  request = null,
} = {}) => {
  await findUserById({ userId, withDeleted: true });
  const result = await walletService.addCredits({
    userId,
    credits: Number(credits),
    type: 'admin',
    source: 'Admin',
    purpose: 'admin_grant',
    description: description || 'Admin credit grant.',
    referenceType: 'User',
    referenceId: userId,
    idempotencyKey: request?.idempotencyKey || null,
  });

  await adminAuditService.logAdminAction({
    request,
    adminUserId,
    action: 'ADMIN_USER_CREDITS_GRANTED',
    targetType: 'User',
    targetId: userId,
    metadata: { credits: Number(credits), transactionId: result.transaction?._id || null },
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
  await findUserById({ userId, withDeleted: true });
  const result = await walletService.deductCredits({
    userId,
    credits: Number(credits),
    type: 'admin',
    source: 'Admin',
    purpose: 'admin_deduct',
    description: description || 'Admin credit deduction.',
    referenceType: 'User',
    referenceId: userId,
    idempotencyKey: request?.idempotencyKey || null,
  });

  await adminAuditService.logAdminAction({
    request,
    adminUserId,
    action: 'ADMIN_USER_CREDITS_DEDUCTED',
    targetType: 'User',
    targetId: userId,
    metadata: { credits: Number(credits), transactionId: result.transaction?._id || null },
  });

  return result;
};

const resetWallet = async ({ userId, reason = null, adminUserId = null, request = null } = {}) => {
  const wallet = await WalletModel.findOne({ user: userId });
  if (!wallet) {
    throw new ApiError(404, 'Wallet not found.', { code: 'WALLET_NOT_FOUND' });
  }
  if (wallet.pendingCredits > 0 || wallet.lockedCredits > 0) {
    throw new ApiError(409, 'Wallet reset requires zero pending and locked credits.', {
      code: 'ADMIN_WALLET_RESET_BLOCKED',
    });
  }
  if (wallet.currentCredits <= 0) {
    return { wallet: buildWalletDto(wallet), transaction: null };
  }

  const result = await deductCredits({
    userId,
    credits: wallet.currentCredits,
    description: reason || 'Admin wallet reset.',
    adminUserId,
    request,
  });

  await adminAuditService.logAdminAction({
    request,
    adminUserId,
    action: 'ADMIN_USER_WALLET_RESET',
    targetType: 'Wallet',
    targetId: wallet._id,
    metadata: { userId, reason },
  });

  return result;
};

const adminUserService = Object.freeze({
  listUsers,
  getUserDetail,
  updateUserStatus,
  assignRole,
  listUserDevices,
  listUserLoginHistory,
  listUserGenerationHistory,
  listUserPayments,
  getUserSubscriptionView,
  grantCredits,
  deductCredits,
  resetWallet,
});

export default adminUserService;
