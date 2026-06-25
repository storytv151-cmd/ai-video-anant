import UserModel from '../../models/User.js';
import ApiError from '../../utils/ApiError.js';
import paymentSettingsService from '../payment/paymentSettingsService.js';
import purchaseDuplicateProtectionService from '../payment/purchaseDuplicateProtectionService.js';

const normalizeString = purchaseDuplicateProtectionService.normalizeString;
const hashPurchaseToken = purchaseDuplicateProtectionService.hashPurchaseToken;

const assertPackageAllowed = ({ settings, packageName } = {}) => {
  const normalized = normalizeString(packageName);
  const allowed = paymentSettingsService.resolveAllowedPackageNames(settings);
  if (normalized && allowed.length > 0 && !allowed.includes(normalized)) {
    throw new ApiError(400, 'Package name does not match configured Google Play application.', {
      code: 'GOOGLE_SUBSCRIPTION_PACKAGE_MISMATCH',
      details: { packageName: normalized },
    });
  }
  return normalized || allowed[0] || null;
};

const assertPlanMatchesVerification = ({ plan, verification } = {}) => {
  if (!plan) {
    throw new ApiError(400, 'Subscription product is not configured.', {
      code: 'GOOGLE_SUBSCRIPTION_PLAN_NOT_CONFIGURED',
    });
  }
  if (verification.productId !== plan.googlePlayProductId) {
    throw new ApiError(400, 'Subscription product does not match configured plan.', {
      code: 'GOOGLE_SUBSCRIPTION_PRODUCT_MISMATCH',
      details: {
        expected: plan.googlePlayProductId,
        actual: verification.productId,
      },
    });
  }
  if (plan.basePlanId && verification.basePlanId && plan.basePlanId !== verification.basePlanId) {
    throw new ApiError(400, 'Base plan does not match configured subscription plan.', {
      code: 'GOOGLE_SUBSCRIPTION_BASE_PLAN_MISMATCH',
      details: {
        expected: plan.basePlanId,
        actual: verification.basePlanId,
      },
    });
  }
};

const assertCountryAllowed = ({ plan, regionCode } = {}) => {
  const countries = Array.isArray(plan?.countries) ? plan.countries : [];
  if (countries.length === 0 || !regionCode) {
    return;
  }
  const normalizedRegion = String(regionCode).trim().toUpperCase();
  const allowedCountries = countries.map((item) => String(item).trim().toUpperCase()).filter(Boolean);
  if (allowedCountries.length > 0 && !allowedCountries.includes(normalizedRegion)) {
    throw new ApiError(400, 'Subscription country is not allowed for this plan.', {
      code: 'GOOGLE_SUBSCRIPTION_COUNTRY_MISMATCH',
      details: {
        expectedCountries: allowedCountries,
        actualCountry: normalizedRegion,
      },
    });
  }
};

const assertOwnership = async ({
  userId = null,
  purchaseTokenHash = null,
  externalAccountId = null,
  externalProfileId = null,
} = {}) => {
  if (purchaseTokenHash) {
    const owner = await UserModel.findOne({
      _id: { $ne: userId },
      'subscription.purchaseTokenHash': purchaseTokenHash,
    })
      .select({ _id: 1 })
      .lean();
    if (owner) {
      throw new ApiError(409, 'Subscription purchase token is already linked to another user.', {
        code: 'GOOGLE_SUBSCRIPTION_TOKEN_REPLAY',
      });
    }
  }

  if (externalAccountId) {
    const owner = await UserModel.findOne({
      _id: { $ne: userId },
      'subscription.externalAccountId': externalAccountId,
    })
      .select({ _id: 1 })
      .lean();
    if (owner) {
      throw new ApiError(409, 'Subscription external account is already linked to another user.', {
        code: 'GOOGLE_SUBSCRIPTION_ACCOUNT_HIJACK',
      });
    }
  }

  if (externalProfileId) {
    const owner = await UserModel.findOne({
      _id: { $ne: userId },
      'subscription.externalProfileId': externalProfileId,
    })
      .select({ _id: 1 })
      .lean();
    if (owner) {
      throw new ApiError(409, 'Subscription external profile is already linked to another user.', {
        code: 'GOOGLE_SUBSCRIPTION_PROFILE_HIJACK',
      });
    }
  }
};

const isNotificationAlreadyProcessed = ({ subscription = {}, notificationId = null } = {}) => {
  const normalized = normalizeString(notificationId);
  if (!normalized) {
    return false;
  }
  if (subscription?.latestNotificationId === normalized) {
    return true;
  }
  const history = Array.isArray(subscription?.history) ? subscription.history : [];
  return history.some((item) => item?.metadata?.notificationId === normalized);
};

const subscriptionFraudService = Object.freeze({
  normalizeString,
  hashPurchaseToken,
  assertPackageAllowed,
  assertPlanMatchesVerification,
  assertCountryAllowed,
  assertOwnership,
  isNotificationAlreadyProcessed,
});

export default subscriptionFraudService;
