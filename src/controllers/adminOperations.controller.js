import { formatSuccessResponse } from '../utils/responseFormatter.js';
import adminAuditService from '../services/admin/adminAuditService.js';
import adminCouponService from '../services/admin/adminCouponService.js';
import adminGenerationService from '../services/admin/adminGenerationService.js';
import adminNotificationService from '../services/admin/adminNotificationService.js';
import adminRoleService from '../services/admin/adminRoleService.js';

const listAdminCoupons = async (request, response) => {
  const data = await adminCouponService.listCoupons({ query: request.query });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const createAdminCoupon = async (request, response) => {
  const data = await adminCouponService.createCoupon({
    payload: request.body,
    adminUserId: request.user.id,
    request,
  });
  response.status(201).json(formatSuccessResponse({ statusCode: 201, data }));
};

const updateAdminCoupon = async (request, response) => {
  const data = await adminCouponService.updateCoupon({
    couponId: request.params.couponId,
    payload: request.body,
    adminUserId: request.user.id,
    request,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const deleteAdminCoupon = async (request, response) => {
  const data = await adminCouponService.deleteCoupon({
    couponId: request.params.couponId,
    adminUserId: request.user.id,
    request,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const listAdminRewards = async (request, response) => {
  const data = await adminCouponService.listRewards({ query: request.query });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const listAdminNotifications = async (request, response) => {
  const data = await adminNotificationService.listNotifications({ query: request.query });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const createAdminNotifications = async (request, response) => {
  const data = await adminNotificationService.createNotifications({
    payload: request.body,
    adminUserId: request.user.id,
    request,
  });
  response.status(201).json(formatSuccessResponse({ statusCode: 201, data }));
};

const listAdminAuditLogs = async (request, response) => {
  const data = await adminAuditService.listAuditLogs({ query: request.query });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const listAdminGenerationJobs = async (request, response) => {
  const data = await adminGenerationService.listGenerationJobs({ query: request.query });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const getAdminGenerationJob = async (request, response) => {
  const data = await adminGenerationService.getGenerationJob({ jobId: request.params.jobId });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const updateAdminGenerationStatus = async (request, response) => {
  const data = await adminGenerationService.updateGenerationStatus({
    jobId: request.params.jobId,
    status: request.body.status,
    reason: request.body.reason || null,
    adminUserId: request.user.id,
    request,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const listAdminRoles = async (request, response) => {
  const data = await adminRoleService.listRoles();
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const listAdminPermissions = async (request, response) => {
  const data = await adminRoleService.listPermissions();
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

export {
  listAdminCoupons,
  createAdminCoupon,
  updateAdminCoupon,
  deleteAdminCoupon,
  listAdminRewards,
  listAdminNotifications,
  createAdminNotifications,
  listAdminAuditLogs,
  listAdminGenerationJobs,
  getAdminGenerationJob,
  updateAdminGenerationStatus,
  listAdminRoles,
  listAdminPermissions,
};
