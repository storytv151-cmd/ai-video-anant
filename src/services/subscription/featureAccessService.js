import UserModel from '../../models/User.js';
import membershipService from './membershipService.js';
import subscriptionValidationService from './subscriptionValidationService.js';

const buildReason = ({ allowed, status, featureName, planCode }) => {
  if (allowed) {
    return 'Feature access granted.';
  }
  if (status === 'expired') {
    return 'Subscription has expired.';
  }
  if (status === 'cancelled') {
    return 'Subscription is cancelled.';
  }
  if (status === 'paused') {
    return 'Subscription is paused.';
  }
  if (status === 'on_hold') {
    return 'Subscription is on hold.';
  }
  if (status === 'revoked') {
    return 'Subscription is revoked.';
  }
  return `Feature "${featureName}" is not enabled for plan "${planCode}".`;
};

const hasUnexpiredEntitlement = ({ status, expiresAt }) => {
  if (subscriptionValidationService.isActiveStatus(status)) {
    return true;
  }
  if (status === 'cancelled' && expiresAt) {
    const expiry = new Date(expiresAt);
    return !Number.isNaN(expiry.getTime()) && expiry.getTime() > Date.now();
  }
  return false;
};

const resolveSubscriptionContext = async ({ user = null, userId = null } = {}) => {
  const config = await membershipService.getMembershipConfig();
  const resolvedUser = user || (userId ? await UserModel.findById(userId).select({ subscription: 1 }).lean() : null);
  const subscription = resolvedUser?.subscription || {};
  const currentPlan = membershipService.resolvePlan({
    plans: config.plans,
    code: subscription.plan || config.defaultPlan.code,
    fallbackPlan: config.defaultPlan,
  });
  const featureCatalog = Array.from(
    new Set([
      ...(config.membershipSettings.featureCatalog || []),
      ...Object.keys(subscription.featureSnapshot || {}),
      ...Object.keys(membershipService.safeMapToObject(currentPlan?.featureFlags)),
    ]),
  );

  const status = membershipService.normalizeStatus(subscription.status || (currentPlan?.code === config.defaultPlan.code ? 'inactive' : 'active'));
  const featureSnapshot = Object.keys(subscription.featureSnapshot || {}).length > 0
    ? membershipService.safeMapToObject(subscription.featureSnapshot)
    : membershipService.buildFeatureSnapshot({ plan: currentPlan, featureCatalog });

  return {
    config,
    user: resolvedUser,
    subscription,
    currentPlan,
    status,
    featureCatalog,
    featureSnapshot,
  };
};

const canUseFeature = async (userOrId, featureName) => {
  const context =
    typeof userOrId === 'object' && userOrId !== null
      ? await resolveSubscriptionContext({ user: userOrId })
      : await resolveSubscriptionContext({ userId: userOrId });

  const normalizedFeature = subscriptionValidationService.assertFeatureName({
    featureName,
    featureCatalog: context.featureCatalog,
  });

  const status = subscriptionValidationService.assertValidStatus(
    context.status,
    context.config.membershipSettings.supportedStatuses,
  );

  const activeStatus =
    hasUnexpiredEntitlement({ status, expiresAt: context.subscription?.expiresAt }) ||
    context.currentPlan?.code === context.config.defaultPlan.code;
  const featureValue = context.featureSnapshot[normalizedFeature];
  const allowed = Boolean(activeStatus && featureValue);

  return {
    allowed,
    reason: buildReason({
      allowed,
      status,
      featureName: normalizedFeature,
      planCode: context.currentPlan?.code || context.config.defaultPlan.code,
    }),
    plan: context.currentPlan?.code || context.config.defaultPlan.code,
    expiry: context.subscription?.expiresAt || null,
    status,
    featureName: normalizedFeature,
  };
};

const getEnabledFeatures = async (userOrId) => {
  const context =
    typeof userOrId === 'object' && userOrId !== null
      ? await resolveSubscriptionContext({ user: userOrId })
      : await resolveSubscriptionContext({ userId: userOrId });

  const features = {};
  for (const featureName of context.featureCatalog) {
    const access = await canUseFeature(context.user || { subscription: context.subscription }, featureName);
    features[featureName] = access.allowed ? context.featureSnapshot[featureName] : false;
  }

  return {
    plan: context.currentPlan?.code || context.config.defaultPlan.code,
    status: context.status,
    expiry: context.subscription?.expiresAt || null,
    features,
  };
};

const featureAccessService = Object.freeze({
  resolveSubscriptionContext,
  canUseFeature,
  getEnabledFeatures,
});

export default featureAccessService;
