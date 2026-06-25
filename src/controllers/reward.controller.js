/**
 * Reward controller.
 * Thin controller that delegates reward logic to the reward service.
 */
import { formatSuccessResponse } from '../utils/responseFormatter.js';
import ApiError from '../utils/ApiError.js';
import rewardService from '../services/wallet/rewardService.js';

const claimDailyBonus = async (request, response) => {
  if (!request.user?.id) {
    throw new ApiError(401, 'Authentication required.', { code: 'AUTH_REQUIRED' });
  }

  const data = await rewardService.claimDailyBonus({ userId: request.user.id });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const claimRewardAd = async (request, response) => {
  if (!request.user?.id) {
    throw new ApiError(401, 'Authentication required.', { code: 'AUTH_REQUIRED' });
  }

  const data = await rewardService.claimRewardAd({ userId: request.user.id });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

export { claimDailyBonus, claimRewardAd };

