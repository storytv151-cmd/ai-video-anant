import paymentSettingsService, {
  getPaymentSettings,
} from "./paymentSettingsService.js";
import purchaseHistoryService from "./purchaseHistoryService.js";
import purchaseVerificationService from "./purchaseVerificationService.js";

const listCreditPackages = async () => {
  const settings = await paymentSettingsService.getPaymentSettings();
  const packages = paymentSettingsService.getMappedCreditPackages(settings);

  return {
    items: packages,
    config: {
      paymentEnabled: Boolean(settings.paymentEnabled),
      googlePlayEnabled: Boolean(settings.googlePlay?.enabled),
      defaultCurrency: settings.payments?.payments?.defaultCurrency || "USD",
      taxPercentage: Number(settings.payments?.payments?.taxPercentage || 0),
      countryPricing: Array.isArray(settings.countryPricing)
        ? settings.countryPricing
        : [],
      futurePricing: Array.isArray(settings.futurePricing)
        ? settings.futurePricing
        : [],
      packageName: settings.googlePlay?.packageName || null,
      appId: settings.googlePlay?.appId || null,
    },
  };
};

const verifyGooglePurchase = async ({
  userId,
  payload = {},
  request = null,
  idempotencyKey = null,
} = {}) =>
  purchaseVerificationService.verifyAndSettleCreditPurchase({
    userId,
    payload,
    request,
    idempotencyKey,
    isRestore: false,
  });

const restorePurchases = async ({
  userId,
  payload = {},
  request = null,
  idempotencyKey = null,
} = {}) =>
  purchaseVerificationService.restoreCreditPurchases({
    userId,
    payload,
    request,
    idempotencyKey,
  });

const listPaymentHistory = async ({ userId, query = {} } = {}) =>
  purchaseHistoryService.listPaymentHistory({ userId, query });

const getPaymentDetail = async ({ userId, paymentId } = {}) =>
  purchaseHistoryService.getPaymentDetail({ userId, paymentId });

const paymentArchitectureService = Object.freeze({
  getPaymentSettings,
  listCreditPackages,
  verifyGooglePurchase,
  restorePurchases,
  listPaymentHistory,
  getPaymentDetail,
});

export default paymentArchitectureService;

export { getPaymentSettings };
