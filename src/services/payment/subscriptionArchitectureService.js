import UserModel from '../../models/User.js';
import { getPaymentSettings } from './paymentArchitectureService.js';

const mapPlan = (plan = {}) => ({
  name: plan.name || null,
  code: plan.code || null,
  googlePlayProductId: plan.googlePlayProductId || null,
  basePlanId: plan.basePlanId || null,
  offerId: plan.offerId || null,
  billingCycle: plan.billingCycle || 'monthly',
  durationDays: Number(plan.durationDays || 0),
  price: Number(plan.price || 0),
  currency: plan.currency || 'USD',
  enabled: Boolean(plan.enabled),
  autoRenew: Boolean(plan.autoRenew),
  premiumFeatures: Array.isArray(plan.premiumFeatures) ? plan.premiumFeatures : [],
  trialDays: Number(plan.trialDays || 0),
  offerLabel: plan.offerLabel || null,
  countries: Array.isArray(plan.countries) ? plan.countries : [],
  metadata: plan.metadata || {},
});

const calculateRemainingDays = (expiresAt) => {
  if (!expiresAt) {
    return null;
  }
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (!Number.isFinite(diffMs)) {
    return null;
  }
  return Math.max(Math.ceil(diffMs / 86_400_000), 0);
};

const listSubscriptionPlans = async () => {
  const settings = await getPaymentSettings();
  const plans = Array.isArray(settings.subscriptionPlans) ? settings.subscriptionPlans : [];

  return {
    items: plans.filter((plan) => plan && plan.enabled !== false).map(mapPlan),
    config: {
      trialSettings: settings.trialSettings || {},
      offerSettings: settings.offerSettings || {},
      googlePlayEnabled: Boolean(settings.googlePlay?.enabled),
    },
  };
};

const getCurrentSubscription = async ({ userId }) => {
  const [settings, user] = await Promise.all([
    getPaymentSettings(),
    UserModel.findById(userId).select({ subscription: 1 }).lean(),
  ]);

  const plans = Array.isArray(settings.subscriptionPlans) ? settings.subscriptionPlans : [];
  const subscription = user?.subscription || {};
  const matchedPlan = plans.find((plan) => plan.code === subscription.plan || plan.googlePlayProductId === subscription.productId) || null;
  const mappedPlan = matchedPlan ? mapPlan(matchedPlan) : null;
  const premiumFeatures =
    Array.isArray(subscription.premiumFeatures) && subscription.premiumFeatures.length > 0
      ? subscription.premiumFeatures
      : mappedPlan?.premiumFeatures || [];

  return {
    currentPlan: subscription.plan || mappedPlan?.code || 'free',
    status: subscription.status || 'inactive',
    expiry: subscription.expiresAt || null,
    autoRenew: Boolean(subscription.autoRenew),
    remainingDays: calculateRemainingDays(subscription.expiresAt),
    premiumFeatures,
    provider: subscription.source || null,
    platform: subscription.platform || null,
    productId: subscription.productId || mappedPlan?.googlePlayProductId || null,
    basePlanId: subscription.basePlanId || mappedPlan?.basePlanId || null,
    offerId: subscription.offerId || mappedPlan?.offerId || null,
    gracePeriodEndsAt: subscription.gracePeriodEndsAt || null,
    onHoldSince: subscription.onHoldSince || null,
    lastVerifiedAt: subscription.lastVerifiedAt || null,
  };
};

const subscriptionArchitectureService = Object.freeze({
  listSubscriptionPlans,
  getCurrentSubscription,
});

export default subscriptionArchitectureService;
