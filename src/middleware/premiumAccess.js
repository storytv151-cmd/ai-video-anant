import ApiError from '../utils/ApiError.js';
import featureAccessService from '../services/subscription/featureAccessService.js';

const requirePremium = async (request, response, next) => {
  try {
    if (!request.user?.id) {
      next(new ApiError(401, 'Authentication required.', { code: 'AUTH_REQUIRED' }));
      return;
    }

    const features = await featureAccessService.getEnabledFeatures(request.user.id);
    const hasPremiumFeature = Object.values(features.features || {}).some((value) => Boolean(value));

    if (!hasPremiumFeature) {
      next(new ApiError(403, 'Premium membership is required.', { code: 'PREMIUM_REQUIRED' }));
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};

const requireFeature = (featureName) => async (request, response, next) => {
  try {
    if (!request.user?.id) {
      next(new ApiError(401, 'Authentication required.', { code: 'AUTH_REQUIRED' }));
      return;
    }

    const access = await featureAccessService.canUseFeature(request.user.id, featureName);
    if (!access.allowed) {
      next(
        new ApiError(403, access.reason || 'Feature access denied.', {
          code: 'FEATURE_ACCESS_DENIED',
          details: access,
        }),
      );
      return;
    }

    request.featureAccess = access;
    next();
  } catch (error) {
    next(error);
  }
};

export { requirePremium, requireFeature };
