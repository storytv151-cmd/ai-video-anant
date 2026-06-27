import { formatSuccessResponse } from "../utils/responseFormatter.js";
import paymentAuditService from "../services/payment/paymentAuditService.js";
import subscriptionRestoreService from "../services/subscription/subscriptionRestoreService.js";
import subscriptionService from "../services/subscription/subscriptionService.js";
import subscriptionSyncService from "../services/subscription/subscriptionSyncService.js";

const listSubscriptions = async (request, response) => {
  const data = await subscriptionService.listSubscriptionPlans();
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const getCurrentSubscription = async (request, response) => {
  const data = await subscriptionService.buildCurrentSubscriptionResponse({
    userId: request.user.id,
  });

  paymentAuditService
    .logSubscriptionViewed({
      userId: request.user.id,
      request,
      metadata: {
        currentPlan: data?.currentPlan || null,
        status: data?.status || null,
      },
    })
    .catch(() => null);

  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const getSubscriptionPlans = async (request, response) => {
  const data = await subscriptionService.listSubscriptionPlans();
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const getSubscriptionHistory = async (request, response) => {
  const data = await subscriptionService.getSubscriptionHistory({
    userId: request.user.id,
    query: request.query,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const verifyGoogleSubscription = async (request, response) => {
  const data = await subscriptionSyncService.verifySubscriptionForUser({
    userId: request.user.id,
    payload: request.body,
    request,
    idempotencyKey: request.idempotencyKey || null,
    syncReason: "verify",
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const restoreGoogleSubscriptions = async (request, response) => {
  const data = await subscriptionRestoreService.restoreSubscriptions({
    userId: request.user.id,
    payload: request.body,
    request,
    idempotencyKey: request.idempotencyKey || null,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const getVerifiedSubscriptionStatus = async (request, response) => {
  const data = await subscriptionSyncService.getVerifiedStatus({
    userId: request.user.id,
    request,
    force:
      String(request.query.force || "")
        .trim()
        .toLowerCase() === "true",
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

export {
  listSubscriptions,
  getCurrentSubscription,
  getSubscriptionPlans,
  getSubscriptionHistory,
  verifyGoogleSubscription,
  restoreGoogleSubscriptions,
  getVerifiedSubscriptionStatus,
};
