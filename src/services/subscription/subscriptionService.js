import UserModel from '../../models/User.js';
import ApiError from '../../utils/ApiError.js';
import featureAccessService from './featureAccessService.js';
import membershipService from './membershipService.js';
import subscriptionHistoryService from './subscriptionHistoryService.js';
import subscriptionValidationService from './subscriptionValidationService.js';

const buildCurrentSubscriptionResponse = async ({ userId }) => {
  const context = await featureAccessService.resolveSubscriptionContext({ userId });
  const remainingDays = membershipService.calculateRemainingDays(context.subscription?.expiresAt);

  return {
    currentPlan: context.currentPlan?.code || context.config.defaultPlan.code,
    status: context.status,
    expiry: context.subscription?.expiresAt || null,
    remainingDays,
    autoRenew: Boolean(context.subscription?.autoRenew ?? context.currentPlan?.autoRenew),
    features: context.featureSnapshot,
    premiumFeatures:
      Array.isArray(context.subscription?.premiumFeatures) && context.subscription.premiumFeatures.length > 0
        ? context.subscription.premiumFeatures
        : context.currentPlan?.premiumFeatures || [],
    planVersion: context.subscription?.planVersion || context.currentPlan?.version || 1,
    gracePeriodEndsAt: context.subscription?.gracePeriodEndsAt || null,
    onHoldSince: context.subscription?.onHoldSince || null,
    trialEndsAt: context.subscription?.trialEndsAt || null,
    provider: context.subscription?.source || null,
    platform: context.subscription?.platform || null,
    productId: context.subscription?.productId || context.currentPlan?.googlePlayProductId || null,
    latestOrderId: context.subscription?.latestOrderId || null,
    googleSubscriptionState: context.subscription?.googleSubscriptionState || null,
    acknowledgementState: context.subscription?.acknowledgementState || null,
    lastVerifiedAt: context.subscription?.lastVerifiedAt || null,
    nextVerificationAt: context.subscription?.nextVerificationAt || null,
    lastSyncedAt: context.subscription?.lastSyncedAt || null,
  };
};

const listSubscriptionPlans = async () => {
  const config = await membershipService.getMembershipConfig();
  return {
    items: config.plans.filter((plan) => plan.enabled !== false),
    config: config.membershipSettings,
  };
};

const getFeatureAccess = async ({ userId, featureName }) =>
  featureAccessService.canUseFeature(userId, featureName);

const getCurrentFeatures = async ({ userId }) =>
  featureAccessService.getEnabledFeatures(userId);

const getSubscriptionHistory = async ({ userId, query = {} } = {}) =>
  subscriptionHistoryService.listSubscriptionHistory({ userId, query });

const buildHistoryEvent = ({
  event,
  previousSubscription = {},
  nextSubscription = {},
  paymentId = null,
  triggeredBy = 'system',
  metadata = {},
}) => ({
  event,
  fromPlan: previousSubscription.plan || null,
  toPlan: nextSubscription.plan || null,
  fromStatus: previousSubscription.status || null,
  toStatus: nextSubscription.status || null,
  triggeredBy,
  payment: paymentId,
  happenedAt: new Date(),
  metadata,
});

const upsertSubscriptionState = async ({
  userId,
  transitionType,
  targetPlanCode,
  status,
  triggeredBy = 'system',
  expiresAt = null,
  autoRenew = null,
  paymentId = null,
  metadata = {},
} = {}) => {
  const config = await membershipService.getMembershipConfig();
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found.', { code: 'USER_NOT_FOUND' });
  }

  const currentPlan = membershipService.resolvePlan({
    plans: config.plans,
    code: user.subscription?.plan || config.defaultPlan.code,
    fallbackPlan: config.defaultPlan,
  });
  const targetPlan = membershipService.resolvePlan({
    plans: config.plans,
    code: targetPlanCode || currentPlan?.code || config.defaultPlan.code,
    fallbackPlan: currentPlan || config.defaultPlan,
  });

  subscriptionValidationService.assertPlanExists(targetPlan, targetPlanCode);
  subscriptionValidationService.assertTransitionSupported({
    transitionType,
    currentPlan,
    targetPlan,
  });

  const nextStatus = subscriptionValidationService.assertValidStatus(
    status || user.subscription?.status || 'inactive',
    config.membershipSettings.supportedStatuses,
  );

  const featureSnapshot = membershipService.buildFeatureSnapshot({
    plan: targetPlan,
    featureCatalog: config.membershipSettings.featureCatalog,
  });

  const previousSubscription = {
    ...(user.subscription?.toObject?.() || user.subscription || {}),
  };
  const metadataObject = metadata || {};
  const featureSnapshotOverride = metadataObject.featureSnapshotOverride || null;
  const limitsSnapshotOverride = metadataObject.limitsSnapshotOverride || null;
  const premiumFeaturesOverride = metadataObject.premiumFeaturesOverride || null;

  user.subscription.plan = targetPlan.code;
  user.subscription.planVersion = targetPlan.version || 1;
  user.subscription.status = nextStatus;
  user.subscription.autoRenew = autoRenew ?? targetPlan.autoRenew ?? false;
  user.subscription.expiresAt = expiresAt || user.subscription.expiresAt || null;
  user.subscription.featureSnapshot = featureSnapshotOverride || featureSnapshot;
  user.subscription.limitsSnapshot = limitsSnapshotOverride || targetPlan.limits || {};
  user.subscription.premiumFeatures = premiumFeaturesOverride || targetPlan.premiumFeatures || [];
  user.subscription.metadata = {
    ...(user.subscription.metadata instanceof Map ? Object.fromEntries(user.subscription.metadata.entries()) : user.subscription.metadata || {}),
    ...metadata,
  };
  user.subscription.currentPeriodStartAt = new Date();
  user.subscription.source = metadataObject.source || user.subscription.source || 'system';
  user.subscription.platform = metadataObject.platform || user.subscription.platform || null;
  user.subscription.productId = metadataObject.productId || user.subscription.productId || null;
  user.subscription.basePlanId = metadataObject.basePlanId || user.subscription.basePlanId || null;
  user.subscription.offerId = metadataObject.offerId || user.subscription.offerId || null;
  user.subscription.orderId = metadataObject.orderId || user.subscription.orderId || null;
  user.subscription.purchaseToken = metadataObject.purchaseToken || user.subscription.purchaseToken || null;
  user.subscription.purchaseTokenHash = metadataObject.purchaseTokenHash || user.subscription.purchaseTokenHash || null;
  user.subscription.linkedPurchaseToken = metadataObject.linkedPurchaseToken || user.subscription.linkedPurchaseToken || null;
  user.subscription.linkedPurchaseTokenHash = metadataObject.linkedPurchaseTokenHash || user.subscription.linkedPurchaseTokenHash || null;
  user.subscription.latestOrderId = metadataObject.latestOrderId || user.subscription.latestOrderId || null;
  user.subscription.googleSubscriptionState = metadataObject.googleSubscriptionState || user.subscription.googleSubscriptionState || null;
  user.subscription.acknowledgementState = metadataObject.acknowledgementState || user.subscription.acknowledgementState || null;
  user.subscription.regionCode = metadataObject.regionCode || user.subscription.regionCode || null;
  user.subscription.externalAccountId = metadataObject.externalAccountId || user.subscription.externalAccountId || null;
  user.subscription.externalProfileId = metadataObject.externalProfileId || user.subscription.externalProfileId || null;
  user.subscription.lastVerifiedAt = metadataObject.lastVerifiedAt || user.subscription.lastVerifiedAt || null;
  user.subscription.nextVerificationAt = metadataObject.nextVerificationAt || user.subscription.nextVerificationAt || null;
  user.subscription.lastSyncedAt = metadataObject.lastSyncedAt || user.subscription.lastSyncedAt || null;
  user.subscription.latestNotificationId = metadataObject.latestNotificationId || user.subscription.latestNotificationId || null;
  user.subscription.latestNotificationType = metadataObject.latestNotificationType || user.subscription.latestNotificationType || null;
  user.subscription.latestNotificationAt = metadataObject.latestNotificationAt || user.subscription.latestNotificationAt || null;
  user.subscription.payment = paymentId || user.subscription.payment || null;
  if (transitionType === 'trial') {
    user.subscription.trialEndsAt = expiresAt || user.subscription.trialEndsAt || null;
  }
  if (transitionType === 'renew') {
    user.subscription.renewalCount = Number(user.subscription.renewalCount || 0) + 1;
  }
  if (transitionType === 'cancel') {
    user.subscription.cancelledAt = new Date();
  }
  if (transitionType === 'resume') {
    user.subscription.resumedAt = new Date();
  }
  if (transitionType === 'pause') {
    user.subscription.pausedAt = new Date();
  }
  if (transitionType === 'expire') {
    user.subscription.expiresAt = expiresAt || user.subscription.expiresAt || new Date();
  }
  if (nextStatus === 'revoked') {
    user.subscription.revokedAt = new Date();
  }
  if (nextStatus === 'on_hold') {
    user.subscription.onHoldSince = user.subscription.onHoldSince || new Date();
  }
  if (nextStatus === 'grace_period') {
    user.subscription.gracePeriodStartedAt = user.subscription.gracePeriodStartedAt || new Date();
    user.subscription.gracePeriodEndsAt = user.subscription.expiresAt || user.subscription.gracePeriodEndsAt || null;
  }

  const nextSubscription = {
    ...(user.subscription?.toObject?.() || user.subscription || {}),
  };
  user.subscription.history = Array.isArray(user.subscription.history) ? user.subscription.history : [];
  user.subscription.history.push(
    buildHistoryEvent({
      event: transitionType,
      previousSubscription,
      nextSubscription,
      paymentId,
      triggeredBy,
      metadata,
    }),
  );

  await user.save();

  return buildCurrentSubscriptionResponse({ userId });
};

const subscriptionService = Object.freeze({
  buildCurrentSubscriptionResponse,
  listSubscriptionPlans,
  getFeatureAccess,
  getCurrentFeatures,
  getSubscriptionHistory,
  upsertSubscriptionState,
});

export default subscriptionService;
