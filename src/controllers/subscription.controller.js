import { formatSuccessResponse } from '../utils/responseFormatter.js';
import paymentAuditService from '../services/payment/paymentAuditService.js';
import subscriptionArchitectureService from '../services/payment/subscriptionArchitectureService.js';

const listSubscriptions = async (request, response) => {
  const data = await subscriptionArchitectureService.listSubscriptionPlans();
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const getCurrentSubscription = async (request, response) => {
  const data = await subscriptionArchitectureService.getCurrentSubscription({ userId: request.user.id });

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

export { listSubscriptions, getCurrentSubscription };
