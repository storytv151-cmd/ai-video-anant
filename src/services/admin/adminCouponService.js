import CouponModel from '../../models/Coupon.js';
import RewardHistoryModel from '../../models/RewardHistory.js';
import ApiError from '../../utils/ApiError.js';
import adminAuditService from './adminAuditService.js';
import adminQueryService from './adminQueryService.js';

const listCoupons = async ({ query = {} } = {}) => {
  const { page, limit, skip } = adminQueryService.buildPagination({
    page: query.page,
    limit: query.limit,
    maxLimit: 100,
  });
  const filter = {};
  if (query.type) {
    filter.type = String(query.type).trim().toLowerCase();
  }
  if (query.enabled !== undefined) {
    filter.enabled = adminQueryService.parseBoolean(query.enabled, false);
  }
  const searchRegex = adminQueryService.buildRegexSearch(query.search);
  if (searchRegex) {
    filter.$or = [{ code: searchRegex }, { title: searchRegex }, { description: searchRegex }];
  }

  const [items, total] = await Promise.all([
    CouponModel.find(filter).withDeleted().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    CouponModel.countDocuments(filter).setOptions({ withDeleted: true }),
  ]);

  return adminQueryService.buildPaginatedResponse({ items, page, limit, total });
};

const createCoupon = async ({ payload = {}, adminUserId = null, request = null } = {}) => {
  const coupon = await CouponModel.create(payload);
  await adminAuditService.logAdminAction({
    request,
    adminUserId,
    action: 'ADMIN_COUPON_CREATED',
    targetType: 'Coupon',
    targetId: coupon._id,
    metadata: { code: coupon.code, type: coupon.type },
  });
  return coupon.toObject();
};

const updateCoupon = async ({ couponId, payload = {}, adminUserId = null, request = null } = {}) => {
  const coupon = await CouponModel.findById(couponId).withDeleted();
  if (!coupon) {
    throw new ApiError(404, 'Coupon not found.', { code: 'COUPON_NOT_FOUND' });
  }
  Object.assign(coupon, payload);
  await coupon.save();
  await adminAuditService.logAdminAction({
    request,
    adminUserId,
    action: 'ADMIN_COUPON_UPDATED',
    targetType: 'Coupon',
    targetId: coupon._id,
    metadata: { code: coupon.code, type: coupon.type },
  });
  return coupon.toObject();
};

const deleteCoupon = async ({ couponId, adminUserId = null, request = null } = {}) => {
  const coupon = await CouponModel.findById(couponId).withDeleted();
  if (!coupon) {
    throw new ApiError(404, 'Coupon not found.', { code: 'COUPON_NOT_FOUND' });
  }
  await coupon.softDelete();
  await adminAuditService.logAdminAction({
    request,
    adminUserId,
    action: 'ADMIN_COUPON_DELETED',
    targetType: 'Coupon',
    targetId: coupon._id,
    metadata: { code: coupon.code },
  });
  return { deleted: true, id: coupon._id };
};

const listRewards = async ({ query = {} } = {}) => {
  const { page, limit, skip } = adminQueryService.buildPagination({
    page: query.page,
    limit: query.limit,
    maxLimit: 100,
  });
  const filter = {};
  if (query.userId) {
    filter.user = query.userId;
  }
  if (query.rewardType) {
    filter.rewardType = String(query.rewardType).trim().toLowerCase();
  }
  if (query.source) {
    filter.source = String(query.source).trim();
  }

  const [items, total] = await Promise.all([
    RewardHistoryModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    RewardHistoryModel.countDocuments(filter),
  ]);
  return adminQueryService.buildPaginatedResponse({ items, page, limit, total });
};

const adminCouponService = Object.freeze({
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  listRewards,
});

export default adminCouponService;
