import crypto from 'node:crypto';
import ApiError from '../../utils/ApiError.js';
import AppSettingModel from '../../models/AppSetting.js';
import PaymentModel from '../../models/Payment.js';
import { buildPaginationMeta } from '../../utils/pagination.js';
import googlePurchaseValidator from './googlePurchaseValidator.js';
import purchaseStateService from './purchaseStateService.js';

const parsePositiveInt = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
};

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

const hashPurchaseToken = (value) => {
  const token = String(value || '').trim();
  if (!token) {
    return null;
  }
  return crypto.createHash('sha256').update(token).digest('hex');
};

const normalizeSort = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  switch (normalized) {
    case 'createdat':
    case 'created_at_asc':
    case 'oldest':
      return { createdAt: 1 };
    case 'amount_desc':
      return { amount: -1, createdAt: -1 };
    case 'amount_asc':
      return { amount: 1, createdAt: -1 };
    default:
      return { createdAt: -1 };
  }
};

const buildDateRange = ({ from = null, to = null } = {}) => {
  const createdAt = {};
  if (from) {
    const parsed = new Date(from);
    if (!Number.isNaN(parsed.getTime())) {
      createdAt.$gte = parsed;
    }
  }
  if (to) {
    const parsed = new Date(to);
    if (!Number.isNaN(parsed.getTime())) {
      createdAt.$lte = parsed;
    }
  }
  return Object.keys(createdAt).length > 0 ? createdAt : null;
};

const mapCreditPackage = (pkg = {}) => ({
  name: pkg.name || null,
  code: pkg.code || null,
  credits: Number(pkg.credits || 0),
  bonusCredits: Number(pkg.bonusCredits || 0),
  totalCredits: Number(pkg.credits || 0) + Number(pkg.bonusCredits || 0),
  price: Number(pkg.price || 0),
  currency: pkg.currency || 'USD',
  enabled: Boolean(pkg.enabled),
  googlePlayProductId: pkg.googlePlayProductId || pkg.externalId || null,
  productType: pkg.productType || 'inapp',
  offerToken: pkg.offerToken || null,
  countries: Array.isArray(pkg.countries) ? pkg.countries : [],
  metadata: pkg.metadata || {},
});

const buildPaymentDto = (payment) => ({
  id: payment._id || payment.id || null,
  paymentType: payment.paymentType || null,
  platform: payment.platform || payment.gateway || null,
  productType: payment.productType || null,
  productId: payment.productId || null,
  packageCode: payment.packageCode || null,
  subscriptionPlanCode: payment.subscriptionPlanCode || null,
  orderId: payment.orderId || null,
  purchaseState: purchaseStateService.normalizePurchaseState(payment.purchaseState || 'pending'),
  verificationStatus: payment.verificationStatus || null,
  status: payment.status || null,
  amount: payment.amount ?? 0,
  currency: payment.currency || null,
  creditsPurchased: payment.creditsPurchased ?? 0,
  autoRenew: Boolean(payment.autoRenew),
  purchaseTime: payment.purchaseTime || null,
  acknowledgedAt: payment.acknowledgedAt || null,
  consumedAt: payment.consumedAt || null,
  expiresAt: payment.expiresAt || null,
  refundedAt: payment.refundedAt || null,
  restoredAt: payment.restoredAt || null,
  createdAt: payment.createdAt || null,
  updatedAt: payment.updatedAt || null,
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
    googlePlay: pick(payments?.payments?.googlePlay, {}),
    creditPackages: pick(payments?.creditPackages, pick(system?.creditPackages, [])),
    subscriptionPlans: pick(payments?.subscriptionPlans, []),
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

const listCreditPackages = async () => {
  const settings = await getPaymentSettings();
  const packages = Array.isArray(settings.creditPackages) ? settings.creditPackages : [];

  return {
    items: packages
      .filter((pkg) => pkg && pkg.enabled !== false)
      .map(mapCreditPackage),
    config: {
      paymentEnabled: Boolean(settings.paymentEnabled),
      googlePlayEnabled: Boolean(settings.googlePlay?.enabled),
      defaultCurrency: settings.payments?.payments?.defaultCurrency || 'USD',
      taxPercentage: Number(settings.payments?.payments?.taxPercentage || 0),
      countryPricing: Array.isArray(settings.countryPricing) ? settings.countryPricing : [],
      futurePricing: Array.isArray(settings.futurePricing) ? settings.futurePricing : [],
    },
  };
};

const verifyGooglePurchasePlaceholder = async ({ userId, payload = {} } = {}) => {
  const settings = await getPaymentSettings();
  assertPaymentsEnabled(settings);
  assertGooglePlayEnabled(settings);

  const purchaseTokenHash = hashPurchaseToken(payload.purchaseToken);
  const existing = purchaseTokenHash || payload.orderId
    ? await PaymentModel.findOne({
        $or: [
          ...(purchaseTokenHash ? [{ platform: 'google_play', purchaseTokenHash }] : []),
          ...(payload.orderId ? [{ platform: 'google_play', orderId: String(payload.orderId).trim() }] : []),
        ],
      })
        .select({ _id: 1, status: 1, paymentType: 1, purchaseState: 1, verificationStatus: 1 })
        .lean()
    : null;

  const validatorResult = await googlePurchaseValidator.validatePurchasePlaceholder({
    packageName: payload.packageName || settings.googlePlay?.packageName || null,
    productId: payload.productId,
    purchaseToken: payload.purchaseToken,
    paymentType: payload.paymentType,
    productType: payload.productType,
    orderId: payload.orderId,
  });

  return {
    phase: '10A',
    provider: 'google_play',
    action: 'verify_purchase_placeholder',
    userId,
    duplicateProtection: {
      purchaseTokenHash,
      existingPaymentId: existing?._id || null,
      duplicateDetected: Boolean(existing),
    },
    validation: validatorResult,
    architecture: {
      willCreatePaymentRecord: true,
      willGrantCredits: payload.paymentType === 'credit_purchase',
      willActivateSubscription: payload.paymentType === 'subscription',
      willWriteAuditLog: true,
      willCallGoogleApiInPhase10B: true,
    },
    message: 'Google Play verification architecture is ready, but external verification is not implemented in this phase.',
  };
};

const restorePurchasesPlaceholder = async ({ userId, payload = {} } = {}) => {
  const settings = await getPaymentSettings();
  assertPaymentsEnabled(settings);
  assertGooglePlayEnabled(settings);

  return {
    phase: '10A',
    provider: 'google_play',
    action: 'restore_purchases_placeholder',
    userId,
    requestedProductIds: Array.isArray(payload.productIds) ? payload.productIds : [],
    requestedOrderIds: Array.isArray(payload.orderIds) ? payload.orderIds : [],
    requestedPurchaseTokens: Array.isArray(payload.purchaseTokens) ? payload.purchaseTokens.length : 0,
    architecture: {
      willLookupHistoricalPayments: true,
      willRevalidateGooglePurchasesInPhase10B: true,
      willReconcileSubscriptionState: true,
      willWriteAuditLog: true,
    },
    message: 'Purchase restore architecture is prepared, but restore and verification logic is deferred to Phase-10B.',
  };
};

const listPaymentHistory = async ({ userId, query = {} } = {}) => {
  const page = parsePositiveInt(query.page, 1);
  const limit = Math.min(parsePositiveInt(query.limit, 20), 100);
  const skip = (page - 1) * limit;
  const filter = { user: userId };

  if (query.status) {
    filter.status = String(query.status).trim().toLowerCase();
  }
  if (query.paymentType) {
    filter.paymentType = String(query.paymentType).trim().toLowerCase();
  }
  if (query.purchaseState) {
    filter.purchaseState = purchaseStateService.normalizePurchaseState(query.purchaseState);
  }
  if (query.productId) {
    filter.productId = String(query.productId).trim();
  }

  const dateRange = buildDateRange({ from: query.from, to: query.to });
  if (dateRange) {
    filter.createdAt = dateRange;
  }

  const [items, total] = await Promise.all([
    PaymentModel.find(filter).sort(normalizeSort(query.sort)).skip(skip).limit(limit).lean(),
    PaymentModel.countDocuments(filter),
  ]);

  return {
    items: items.map(buildPaymentDto),
    meta: buildPaginationMeta({ page, limit, total }),
  };
};

const paymentArchitectureService = Object.freeze({
  getPaymentSettings,
  listCreditPackages,
  verifyGooglePurchasePlaceholder,
  restorePurchasesPlaceholder,
  listPaymentHistory,
});

export default paymentArchitectureService;

export { getPaymentSettings };
