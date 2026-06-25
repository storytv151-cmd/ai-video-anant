import environment from '../../config/environment.js';
import AppSettingModel from '../../models/AppSetting.js';
import ApiError from '../../utils/ApiError.js';

const indexSettings = (docs) => {
  const map = new Map();
  for (const doc of docs) {
    const section = doc.section || 'GENERAL';
    const key = doc.key || 'global';
    map.set(`${section}:${key}`, doc);
  }
  return map;
};

const getSetting = (map, section, key = 'global') => map.get(`${section}:${key}`) || null;
const pick = (value, fallback = null) => (value === undefined ? fallback : value);

const mapCreditPackage = (pkg = {}) => ({
  name: pkg.name || null,
  code: pkg.code || null,
  credits: Number(pkg.credits || 0),
  bonusCredits: Number(pkg.bonusCredits || 0),
  totalCredits: Number(pkg.credits || 0) + Number(pkg.bonusCredits || 0),
  price: Number(pkg.price || 0),
  currency: pkg.currency || 'USD',
  enabled: Boolean(pkg.enabled),
  externalId: pkg.externalId || null,
  googlePlayProductId: pkg.googlePlayProductId || pkg.externalId || null,
  productType: pkg.productType || 'inapp',
  offerToken: pkg.offerToken || null,
  countries: Array.isArray(pkg.countries) ? pkg.countries : [],
  metadata: pkg.metadata || {},
});

const mapSubscriptionPlan = (plan = {}) => ({
  name: plan.name || null,
  code: plan.code || null,
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
  countries: Array.isArray(plan.countries) ? plan.countries : [],
  premiumFeatures: Array.isArray(plan.premiumFeatures) ? plan.premiumFeatures : [],
  featureFlags: plan.featureFlags || {},
  limits: plan.limits || {},
  transitions: plan.transitions || {},
  metadata: plan.metadata || {},
});

const getPaymentSettings = async () => {
  const docs = await AppSettingModel.find({}).lean();
  const settingsIndex = indexSettings(docs);
  const payments = getSetting(settingsIndex, 'PAYMENTS') || getSetting(settingsIndex, 'GENERAL') || null;
  const system = getSetting(settingsIndex, 'SYSTEM') || getSetting(settingsIndex, 'GENERAL') || null;

  return {
    payments,
    system,
    paymentEnabled: Boolean(pick(payments?.payments?.enabled, false)),
    googlePlay: {
      ...pick(payments?.payments?.googlePlay, {}),
      packageName:
        pick(payments?.payments?.googlePlay?.packageName, null) ||
        environment.integrations.googlePlay.packageName ||
        null,
      appId:
        pick(payments?.payments?.googlePlay?.appId, null) ||
        environment.integrations.googlePlay.appId ||
        null,
      rtdnAudience:
        pick(payments?.payments?.googlePlay?.rtdnAudience, null) ||
        environment.integrations.googlePlay.rtdnAudience ||
        null,
      rtdnAuthorizedEmails:
        pick(payments?.payments?.googlePlay?.rtdnAuthorizedEmails, null) ||
        environment.integrations.googlePlay.rtdnAuthorizedEmails ||
        [],
      rtdnVerificationToken:
        pick(payments?.payments?.googlePlay?.rtdnVerificationToken, null) ||
        environment.integrations.googlePlay.rtdnVerificationToken ||
        null,
    },
    creditPackages: pick(payments?.creditPackages, pick(system?.creditPackages, [])),
    subscriptionPlans: pick(payments?.subscriptionPlans, []),
    membershipSettings: pick(payments?.membershipSettings, {}),
    trialSettings: pick(payments?.trialSettings, {}),
    offerSettings: pick(payments?.offerSettings, {}),
    countryPricing: pick(payments?.countryPricing, []),
    futurePricing: pick(payments?.futurePricing, []),
  };
};

const assertPaymentsEnabled = (settings) => {
  if (!settings?.paymentEnabled) {
    throw new ApiError(403, 'Payments are disabled.', { code: 'PAYMENTS_DISABLED' });
  }
};

const assertGooglePlayEnabled = (settings) => {
  if (!settings?.googlePlay?.enabled) {
    throw new ApiError(403, 'Google Play billing is disabled.', { code: 'PAYMENT_GATEWAY_DISABLED' });
  }
};

const getMappedCreditPackages = (settings) =>
  (Array.isArray(settings?.creditPackages) ? settings.creditPackages : [])
    .filter((pkg) => pkg && pkg.enabled !== false)
    .map(mapCreditPackage);

const getMappedSubscriptionPlans = (settings) =>
  (Array.isArray(settings?.subscriptionPlans) ? settings.subscriptionPlans : [])
    .filter((plan) => plan && plan.enabled !== false)
    .map(mapSubscriptionPlan);

const findCreditPackageByProductId = ({ settings, productId }) => {
  const normalized = String(productId || '').trim();
  if (!normalized) {
    return null;
  }

  return (
    getMappedCreditPackages(settings).find(
      (pkg) =>
        pkg.googlePlayProductId === normalized ||
        pkg.externalId === normalized ||
        pkg.code === normalized.toUpperCase(),
    ) || null
  );
};

const resolveAllowedPackageNames = (settings) =>
  [settings?.googlePlay?.packageName, settings?.googlePlay?.linkedPackageName, environment.integrations.googlePlay.packageName]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

const findSubscriptionPlanByProductId = ({ settings, productId, basePlanId = null } = {}) => {
  const normalizedProductId = String(productId || '').trim();
  const normalizedBasePlanId = String(basePlanId || '').trim();
  if (!normalizedProductId) {
    return null;
  }

  return (
    getMappedSubscriptionPlans(settings).find(
      (plan) =>
        plan.googlePlayProductId === normalizedProductId &&
        (!normalizedBasePlanId || !plan.basePlanId || plan.basePlanId === normalizedBasePlanId),
    ) || null
  );
};

const paymentSettingsService = Object.freeze({
  getPaymentSettings,
  assertPaymentsEnabled,
  assertGooglePlayEnabled,
  mapCreditPackage,
  mapSubscriptionPlan,
  getMappedCreditPackages,
  getMappedSubscriptionPlans,
  findCreditPackageByProductId,
  findSubscriptionPlanByProductId,
  resolveAllowedPackageNames,
});

export default paymentSettingsService;
export {
  getPaymentSettings,
  assertPaymentsEnabled,
  assertGooglePlayEnabled,
  mapCreditPackage,
  mapSubscriptionPlan,
  getMappedCreditPackages,
  getMappedSubscriptionPlans,
  findCreditPackageByProductId,
  findSubscriptionPlanByProductId,
  resolveAllowedPackageNames,
};
