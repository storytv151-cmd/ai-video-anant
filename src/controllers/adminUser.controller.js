import { formatSuccessResponse } from '../utils/responseFormatter.js';
import adminUserService from '../services/admin/adminUserService.js';

const listAdminUsers = async (request, response) => {
  const data = await adminUserService.listUsers({ query: request.query });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const getAdminUserDetail = async (request, response) => {
  const data = await adminUserService.getUserDetail({ userId: request.params.userId });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const updateAdminUserStatus = async (request, response) => {
  const data = await adminUserService.updateUserStatus({
    userId: request.params.userId,
    status: request.body.status,
    reason: request.body.reason || null,
    adminUserId: request.user.id,
    request,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const assignAdminUserRole = async (request, response) => {
  const data = await adminUserService.assignRole({
    userId: request.params.userId,
    role: request.body.role,
    adminRoleCode: request.body.adminRoleCode || null,
    reason: request.body.reason || null,
    adminUserId: request.user.id,
    request,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const listAdminUserDevices = async (request, response) => {
  const data = await adminUserService.listUserDevices({ userId: request.params.userId });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const listAdminUserLoginHistory = async (request, response) => {
  const data = await adminUserService.listUserLoginHistory({
    userId: request.params.userId,
    query: request.query,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const listAdminUserGenerations = async (request, response) => {
  const data = await adminUserService.listUserGenerationHistory({
    userId: request.params.userId,
    query: request.query,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const listAdminUserPayments = async (request, response) => {
  const data = await adminUserService.listUserPayments({
    userId: request.params.userId,
    query: request.query,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const getAdminUserSubscriptions = async (request, response) => {
  const data = await adminUserService.getUserSubscriptionView({
    userId: request.params.userId,
    query: request.query,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const grantAdminUserCredits = async (request, response) => {
  const data = await adminUserService.grantCredits({
    userId: request.params.userId,
    credits: request.body.credits,
    description: request.body.description || null,
    adminUserId: request.user.id,
    request,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const deductAdminUserCredits = async (request, response) => {
  const data = await adminUserService.deductCredits({
    userId: request.params.userId,
    credits: request.body.credits,
    description: request.body.description || null,
    adminUserId: request.user.id,
    request,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const resetAdminUserWallet = async (request, response) => {
  const data = await adminUserService.resetWallet({
    userId: request.params.userId,
    reason: request.body.reason || null,
    adminUserId: request.user.id,
    request,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

export {
  listAdminUsers,
  getAdminUserDetail,
  updateAdminUserStatus,
  assignAdminUserRole,
  listAdminUserDevices,
  listAdminUserLoginHistory,
  listAdminUserGenerations,
  listAdminUserPayments,
  getAdminUserSubscriptions,
  grantAdminUserCredits,
  deductAdminUserCredits,
  resetAdminUserWallet,
};
