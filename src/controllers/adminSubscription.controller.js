import { formatSuccessResponse } from '../utils/responseFormatter.js';
import adminSubscriptionService from '../services/admin/adminSubscriptionService.js';

const listAdminSubscriptions = async (request, response) => {
  const data = await adminSubscriptionService.listSubscriptions({ query: request.query });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const getAdminSubscription = async (request, response) => {
  const data = await adminSubscriptionService.getSubscriptionDetail({
    userId: request.params.userId,
    query: request.query,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const cancelAdminSubscription = async (request, response) => {
  const data = await adminSubscriptionService.cancelSubscription({
    userId: request.params.userId,
    reason: request.body.reason || null,
    adminUserId: request.user.id,
    request,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const extendAdminSubscription = async (request, response) => {
  const data = await adminSubscriptionService.extendSubscription({
    userId: request.params.userId,
    days: request.body.days,
    reason: request.body.reason || null,
    adminUserId: request.user.id,
    request,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const grantAdminSubscription = async (request, response) => {
  const data = await adminSubscriptionService.grantPremium({
    userId: request.params.userId,
    planCode: request.body.planCode,
    days: request.body.days,
    reason: request.body.reason || null,
    adminUserId: request.user.id,
    request,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const removeAdminSubscription = async (request, response) => {
  const data = await adminSubscriptionService.removePremium({
    userId: request.params.userId,
    reason: request.body.reason || null,
    adminUserId: request.user.id,
    request,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const trialAdminSubscription = async (request, response) => {
  const data = await adminSubscriptionService.trialSubscription({
    userId: request.params.userId,
    planCode: request.body.planCode,
    days: request.body.days,
    reason: request.body.reason || null,
    adminUserId: request.user.id,
    request,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const renewAdminSubscription = async (request, response) => {
  const data = await adminSubscriptionService.renewSubscription({
    userId: request.params.userId,
    days: request.body.days,
    reason: request.body.reason || null,
    adminUserId: request.user.id,
    request,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

export {
  listAdminSubscriptions,
  getAdminSubscription,
  cancelAdminSubscription,
  extendAdminSubscription,
  grantAdminSubscription,
  removeAdminSubscription,
  trialAdminSubscription,
  renewAdminSubscription,
};
