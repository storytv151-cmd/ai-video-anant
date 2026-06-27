import UserModel from "../../models/User.js";
import ApiError from "../../utils/ApiError.js";
import { buildUserDto } from "../../utils/user.dto.js";
import membershipService from "../subscription/membershipService.js";
import subscriptionService from "../subscription/subscriptionService.js";
import adminAuditService from "./adminAuditService.js";
import adminQueryService from "./adminQueryService.js";

const addDays = ({ baseDate = null, days = 0 } = {}) => {
  const date = baseDate ? new Date(baseDate) : new Date();
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  date.setUTCDate(date.getUTCDate() + Number(days || 0));
  return date;
};

const findSubscriptionUser = async ({ userId, withDeleted = true } = {}) => {
  let query = UserModel.findById(userId).select({
    name: 1,
    email: 1,
    country: 1,
    subscription: 1,
    role: 1,
    accountStatus: 1,
  });
  if (withDeleted) {
    query = query.withDeleted();
  }
  const user = await query;
  if (!user) {
    throw new ApiError(404, "User not found.", { code: "USER_NOT_FOUND" });
  }
  return user;
};

const listSubscriptions = async ({ query = {} } = {}) => {
  const { page, limit, skip } = adminQueryService.buildPagination({
    page: query.page,
    limit: query.limit,
    maxLimit: 100,
  });
  const filter = {};
  if (query.status) {
    filter["subscription.status"] = String(query.status).trim().toLowerCase();
  }
  if (query.plan) {
    filter["subscription.plan"] = String(query.plan).trim().toLowerCase();
  }
  if (query.country) {
    filter.country = String(query.country).trim().toUpperCase();
  }
  const searchRegex = adminQueryService.buildRegexSearch(query.search);
  if (searchRegex) {
    filter.$or = [{ name: searchRegex }, { email: searchRegex }];
  }

  let findQuery = UserModel.find(filter)
    .select({
      name: 1,
      email: 1,
      country: 1,
      subscription: 1,
      role: 1,
      accountStatus: 1,
    })
    .sort({ "subscription.expiresAt": -1, createdAt: -1 })
    .skip(skip)
    .limit(limit);
  let countQuery = UserModel.countDocuments(filter);
  if (adminQueryService.parseBoolean(query.includeDeleted, false)) {
    findQuery = findQuery.withDeleted();
    countQuery = UserModel.countDocuments(filter).setOptions({
      withDeleted: true,
    });
  }

  const [items, total] = await Promise.all([findQuery.lean(), countQuery]);
  return adminQueryService.buildPaginatedResponse({
    items: items.map((item) => ({
      user: buildUserDto(item),
      subscription: item.subscription || null,
    })),
    page,
    limit,
    total,
  });
};

const getSubscriptionDetail = async ({ userId, query = {} } = {}) => {
  await findSubscriptionUser({ userId, withDeleted: true });
  const [current, history] = await Promise.all([
    subscriptionService.buildCurrentSubscriptionResponse({ userId }),
    subscriptionService.getSubscriptionHistory({ userId, query }),
  ]);
  return { current, history };
};

const applySubscriptionAction = async ({
  userId,
  transitionType,
  targetPlanCode,
  status,
  expiresAt = null,
  autoRenew = null,
  metadata = {},
  action,
  adminUserId = null,
  request = null,
} = {}) => {
  const updated = await subscriptionService.upsertSubscriptionState({
    userId,
    transitionType,
    targetPlanCode,
    status,
    autoRenew,
    expiresAt,
    triggeredBy: "admin",
    metadata: {
      ...metadata,
      source: "admin",
      platform: metadata.platform || null,
    },
  });

  await adminAuditService.logAdminAction({
    request,
    adminUserId,
    action,
    targetType: "UserSubscription",
    targetId: userId,
    metadata: {
      targetPlanCode,
      status,
      expiresAt,
      ...metadata,
    },
  });

  return updated;
};

const cancelSubscription = async ({
  userId,
  reason = null,
  adminUserId = null,
  request = null,
} = {}) => {
  const user = await findSubscriptionUser({ userId, withDeleted: true });
  return applySubscriptionAction({
    userId,
    transitionType: "cancel",
    targetPlanCode: user.subscription?.plan || "free",
    status: "cancelled",
    expiresAt: user.subscription?.expiresAt || null,
    autoRenew: false,
    metadata: { reason },
    action: "ADMIN_SUBSCRIPTION_CANCELLED",
    adminUserId,
    request,
  });
};

const extendSubscription = async ({
  userId,
  days,
  reason = null,
  adminUserId = null,
  request = null,
} = {}) => {
  const user = await findSubscriptionUser({ userId, withDeleted: true });
  const currentExpiry = user.subscription?.expiresAt || new Date();
  const expiresAt = addDays({ baseDate: currentExpiry, days });
  return applySubscriptionAction({
    userId,
    transitionType: "renew",
    targetPlanCode: user.subscription?.plan || "free",
    status: "active",
    expiresAt,
    autoRenew: user.subscription?.autoRenew ?? true,
    metadata: { reason, extendedDays: Number(days || 0) },
    action: "ADMIN_SUBSCRIPTION_EXTENDED",
    adminUserId,
    request,
  });
};

const grantPremium = async ({
  userId,
  planCode,
  days = 30,
  reason = null,
  adminUserId = null,
  request = null,
} = {}) => {
  const expiresAt = addDays({ baseDate: new Date(), days });
  return applySubscriptionAction({
    userId,
    transitionType: "upgrade",
    targetPlanCode: planCode,
    status: "active",
    expiresAt,
    autoRenew: false,
    metadata: { reason, grantedDays: Number(days || 0) },
    action: "ADMIN_SUBSCRIPTION_GRANTED",
    adminUserId,
    request,
  });
};

const removePremium = async ({
  userId,
  reason = null,
  adminUserId = null,
  request = null,
} = {}) => {
  const config = await membershipService.getMembershipConfig();
  return applySubscriptionAction({
    userId,
    transitionType: "expire",
    targetPlanCode: config.defaultPlan.code,
    status: "expired",
    expiresAt: new Date(),
    autoRenew: false,
    metadata: { reason },
    action: "ADMIN_SUBSCRIPTION_PREMIUM_REMOVED",
    adminUserId,
    request,
  });
};

const trialSubscription = async ({
  userId,
  planCode,
  days = 7,
  reason = null,
  adminUserId = null,
  request = null,
} = {}) => {
  const expiresAt = addDays({ baseDate: new Date(), days });
  return applySubscriptionAction({
    userId,
    transitionType: "trial",
    targetPlanCode: planCode,
    status: "trial",
    expiresAt,
    autoRenew: false,
    metadata: { reason, trialDays: Number(days || 0) },
    action: "ADMIN_SUBSCRIPTION_TRIAL_GRANTED",
    adminUserId,
    request,
  });
};

const renewSubscription = async ({
  userId,
  days = 30,
  reason = null,
  adminUserId = null,
  request = null,
} = {}) => {
  const user = await findSubscriptionUser({ userId, withDeleted: true });
  const expiresAt = addDays({
    baseDate: user.subscription?.expiresAt || new Date(),
    days,
  });
  return applySubscriptionAction({
    userId,
    transitionType: "renew",
    targetPlanCode: user.subscription?.plan || "free",
    status: "renewed",
    expiresAt,
    autoRenew: user.subscription?.autoRenew ?? true,
    metadata: { reason, renewedDays: Number(days || 0) },
    action: "ADMIN_SUBSCRIPTION_RENEWED",
    adminUserId,
    request,
  });
};

const adminSubscriptionService = Object.freeze({
  listSubscriptions,
  getSubscriptionDetail,
  cancelSubscription,
  extendSubscription,
  grantPremium,
  removePremium,
  trialSubscription,
  renewSubscription,
});

export default adminSubscriptionService;
