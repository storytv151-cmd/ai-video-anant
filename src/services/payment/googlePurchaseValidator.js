import purchaseStateService from "./purchaseStateService.js";

const validatePurchasePlaceholder = async ({
  packageName = null,
  productId = null,
  purchaseToken = null,
  paymentType = "credit_purchase",
  productType = "inapp",
  orderId = null,
} = {}) => ({
  provider: "google_play",
  integrationReady: false,
  verified: false,
  verificationStatus: "not_requested",
  paymentType,
  productType,
  packageName: packageName || null,
  productId: productId || null,
  orderId: orderId || null,
  purchaseTokenPresent: Boolean(purchaseToken),
  purchaseState: purchaseStateService.normalizePurchaseState("pending"),
  message:
    "Google Play Developer API verification is intentionally deferred to Phase-10B.",
});

const googlePurchaseValidator = Object.freeze({
  validatePurchasePlaceholder,
});

export default googlePurchaseValidator;
