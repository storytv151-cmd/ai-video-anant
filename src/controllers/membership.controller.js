import { formatSuccessResponse } from "../utils/responseFormatter.js";
import subscriptionService from "../services/subscription/subscriptionService.js";

const getMembershipFeatures = async (request, response) => {
  const data = await subscriptionService.getCurrentFeatures({
    userId: request.user.id,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const checkMembershipFeature = async (request, response) => {
  const data = await subscriptionService.getFeatureAccess({
    userId: request.user.id,
    featureName: request.body.featureName,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

export { getMembershipFeatures, checkMembershipFeature };
