import { getPaymentSettings } from '../payment/paymentSettingsService.js';

const PLAN_CODES = Object.freeze({
  FREE: 'free',
  PREMIUM_MONTHLY: 'premium_monthly',
  PREMIUM_QUARTERLY: 'premium_quarterly',
  PREMIUM_YEARLY: 'premium_yearly',
  CREATOR: 'creator',
  FAMILY: 'family',
  ENTERPRISE: 'enterprise',
});

const DEFAULT_FEATURES = Object.freeze([
  'removeAds',
  'premiumTemplates',
  'priorityQueue',
  'highResolution',
  'maxConcurrentJobs',
  'dailyRewardMultiplier',
  'creditPurchaseDiscount',
  'premiumModels',
  'premiumSupport',
  'betaFeatures',
  'futureFeatures',
]);

const safeMapToObject = (value) => {
  if (!value) {
    return {};
  }
  if (value instanceof Map) {
    return Object.fromEntries(value.entries());
  }
  return typeof value === 'object' ? value : {};
};

const normalizePlanCode = (value, fallback = PLAN_CODES.FREE) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  return normalized || fallback;
};

const normalizeStatus = (value, fallback = 'inactive') =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_') || fallback;

const buildPlanDto = (plan = {}) => ({
  name: plan.name || null,
  code: normalizePlanCode(plan.code),
  version: Number(plan.version || 1),
  googlePlayProductId: plan.googlePlayProductId || null,
  basePlanId: plan.basePlanId || null,
  offerId: plan.offerId || null,
  billingCycle: plan.billingCycle || 'custom',
  durationDays: Number(plan.durationDays || 0),
  price: Number(plan.price || 0),
  currency: plan.currency || 'USD',
  enabled: Boolean(plan.enabled),
  isDefault: Boolean(plan.isDefault),
  isPremium: Boolean(plan.isPremium),
  autoRenew: Boolean(plan.autoRenew),
  trialDays: Number(plan.trialDays || 0),
  offerLabel: plan.offerLabel || null,
  countries: Array.isArray(plan.countries) ? plan.countries : [],
  premiumFeatures: Array.isArray(plan.premiumFeatures) ? plan.premiumFeatures : [],
  featureFlags: safeMapToObject(plan.featureFlags),
  limits: safeMapToObject(plan.limits),
  transitions: {
    allowUpgrade: Boolean(plan.transitions?.allowUpgrade ?? true),
    allowDowngrade: Boolean(plan.transitions?.allowDowngrade ?? true),
    allowRenew: Boolean(plan.transitions?.allowRenew ?? true),
    allowPause: Boolean(plan.transitions?.allowPause ?? true),
    allowResume: Boolean(plan.transitions?.allowResume ?? true),
    allowCancel: Boolean(plan.transitions?.allowCancel ?? true),
    allowTrial: Boolean(plan.transitions?.allowTrial ?? false),
    metadata: safeMapToObject(plan.transitions?.metadata),
  },
  metadata: safeMapToObject(plan.metadata),
});

const mergeFeatureCatalog = ({ plan = null, membershipSettings = {} } = {}) => {
  const configuredCatalog = Array.isArray(membershipSettings?.featureCatalog)
    ? membershipSettings.featureCatalog
    : [];
  const planFlags = plan ? Object.keys(plan.featureFlags || {}) : [];
  return Array.from(new Set([...DEFAULT_FEATURES, ...configuredCatalog, ...planFlags]));
};

const getMembershipConfig = async () => {
  const settings = await getPaymentSettings();
  const membershipSettings = settings.membershipSettings || settings.payments?.membershipSettings || {};
  const plans = Array.isArray(settings.subscriptionPlans) ? settings.subscriptionPlans.map(buildPlanDto) : [];
  const freePlanCode = normalizePlanCode(membershipSettings.freePlanCode || PLAN_CODES.FREE, PLAN_CODES.FREE);
  const defaultPlan =
    plans.find((plan) => plan.isDefault) ||
    plans.find((plan) => plan.code === freePlanCode) ||
    plans[0] ||
    buildPlanDto({
      name: 'Free',
      code: freePlanCode,
      enabled: true,
      isDefault: true,
      isPremium: false,
      featureFlags: {},
      limits: {},
      premiumFeatures: [],
      billingCycle: 'custom',
      durationDays: 0,
      trialDays: 0,
    });

  return {
    membershipSettings: {
      enabled: membershipSettings.enabled !== false,
      freePlanCode,
      gracePeriodDays: Number(membershipSettings.gracePeriodDays || 0),
      allowTrials: Boolean(membershipSettings.allowTrials),
      allowPlanPause: Boolean(membershipSettings.allowPlanPause),
      allowGiftSubscription: Boolean(membershipSettings.allowGiftSubscription),
      supportedStatuses: Array.isArray(membershipSettings.supportedStatuses)
        ? membershipSettings.supportedStatuses.map((item) => normalizeStatus(item))
        : [],
      featureCatalog: mergeFeatureCatalog({ plan: defaultPlan, membershipSettings }),
      futurePlans: Array.isArray(membershipSettings.futurePlans) ? membershipSettings.futurePlans : [],
      metadata: safeMapToObject(membershipSettings.metadata),
    },
    plans,
    defaultPlan,
  };
};

const resolvePlan = ({ plans = [], code = null, fallbackPlan = null } = {}) => {
  const normalizedCode = normalizePlanCode(code, fallbackPlan?.code || PLAN_CODES.FREE);
  return plans.find((plan) => plan.code === normalizedCode) || fallbackPlan || null;
};

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

const buildFeatureSnapshot = ({ plan = null, featureCatalog = [] } = {}) => {
  const flags = safeMapToObject(plan?.featureFlags);
  const catalog = Array.from(new Set([...(featureCatalog || []), ...Object.keys(flags)]));
  const features = {};

  for (const featureName of catalog) {
    const value = flags[featureName];
    features[featureName] = value === undefined ? false : value;
  }

  return features;
};

const membershipService = Object.freeze({
  PLAN_CODES,
  DEFAULT_FEATURES,
  normalizePlanCode,
  normalizeStatus,
  buildPlanDto,
  getMembershipConfig,
  resolvePlan,
  calculateRemainingDays,
  buildFeatureSnapshot,
  safeMapToObject,
});

export default membershipService;
