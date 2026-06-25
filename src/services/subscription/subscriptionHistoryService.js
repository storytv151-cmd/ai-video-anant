import UserModel from '../../models/User.js';
import ApiError from '../../utils/ApiError.js';
import { buildPaginationMeta } from '../../utils/pagination.js';

const parsePositiveInt = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
};

const normalizeSortDirection = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'asc' || normalized === 'oldest' ? 1 : -1;
};

const listSubscriptionHistory = async ({ userId, query = {} } = {}) => {
  const user = await UserModel.findById(userId).select({ subscription: 1 }).lean();
  if (!user) {
    throw new ApiError(404, 'User not found.', { code: 'USER_NOT_FOUND' });
  }

  const direction = normalizeSortDirection(query.sort);
  const page = parsePositiveInt(query.page, 1);
  const limit = Math.min(parsePositiveInt(query.limit, 20), 100);
  const history = Array.isArray(user.subscription?.history) ? [...user.subscription.history] : [];
  const sorted = history.sort((a, b) => {
    const aTime = new Date(a?.happenedAt || 0).getTime();
    const bTime = new Date(b?.happenedAt || 0).getTime();
    return direction === 1 ? aTime - bTime : bTime - aTime;
  });

  const filtered = query.event
    ? sorted.filter((item) => String(item?.event || '').trim().toLowerCase() === String(query.event).trim().toLowerCase())
    : sorted;

  const total = filtered.length;
  const start = (page - 1) * limit;
  const items = filtered.slice(start, start + limit).map((item) => ({
    event: item.event || null,
    fromPlan: item.fromPlan || null,
    toPlan: item.toPlan || null,
    fromStatus: item.fromStatus || null,
    toStatus: item.toStatus || null,
    triggeredBy: item.triggeredBy || null,
    payment: item.payment || null,
    happenedAt: item.happenedAt || null,
    metadata: item.metadata || {},
  }));

  return {
    items,
    meta: buildPaginationMeta({ page, limit, total }),
  };
};

const subscriptionHistoryService = Object.freeze({
  listSubscriptionHistory,
});

export default subscriptionHistoryService;
