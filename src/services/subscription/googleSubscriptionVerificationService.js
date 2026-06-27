import ApiError from "../../utils/ApiError.js";
import { authorizedRequest } from "../payment/googlePlayVerificationService.js";

const safeDateFromTimestamp = (value) => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
};

const mapGoogleSubscriptionState = (value) => {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  switch (normalized) {
    case "SUBSCRIPTION_STATE_ACTIVE":
      return "active";
    case "SUBSCRIPTION_STATE_PENDING":
      return "pending";
    case "SUBSCRIPTION_STATE_IN_GRACE_PERIOD":
      return "grace_period";
    case "SUBSCRIPTION_STATE_ON_HOLD":
      return "on_hold";
    case "SUBSCRIPTION_STATE_PAUSED":
      return "paused";
    case "SUBSCRIPTION_STATE_CANCELED":
      return "cancelled";
    case "SUBSCRIPTION_STATE_EXPIRED":
      return "expired";
    default:
      return "pending";
  }
};

const mapAcknowledgementState = (value) => {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  if (!normalized) {
    return "ACKNOWLEDGEMENT_STATE_UNSPECIFIED";
  }
  return normalized;
};

const pickPrimaryLineItem = (response = {}) => {
  if (Array.isArray(response.lineItems) && response.lineItems.length > 0) {
    return response.lineItems[0];
  }
  return {};
};

const deriveTrialState = (lineItem = {}) => {
  if (lineItem?.offerDetails?.basePlanId && lineItem?.offerDetails?.offerId) {
    return false;
  }
  return Boolean(lineItem?.offerPhase?.freeTrial);
};

const normalizeSubscriptionResponse = ({
  packageName,
  purchaseToken,
  response,
  verificationTimeMs,
} = {}) => {
  const lineItem = pickPrimaryLineItem(response);
  const latestOrderId =
    lineItem?.latestSuccessfulOrderId || response?.latestOrderId || null;
  const productId = lineItem?.productId || null;
  const basePlanId = lineItem?.offerDetails?.basePlanId || null;
  const offerId = lineItem?.offerDetails?.offerId || null;
  const expiryTime = safeDateFromTimestamp(lineItem?.expiryTime);
  const startTime = safeDateFromTimestamp(response?.startTime);
  const googleState =
    String(response?.subscriptionState || "")
      .trim()
      .toUpperCase() || "SUBSCRIPTION_STATE_PENDING";
  const internalState = mapGoogleSubscriptionState(googleState);
  const isTrial = deriveTrialState(lineItem);
  const acknowledgementState = mapAcknowledgementState(
    response?.acknowledgementState,
  );
  const autoRenewEnabled = Boolean(
    lineItem?.autoRenewingPlan?.autoRenewEnabled,
  );

  return {
    provider: "google_play",
    verified: true,
    verificationStatus: "verified",
    packageName,
    purchaseToken,
    linkedPurchaseToken: response?.linkedPurchaseToken || null,
    productId,
    basePlanId,
    offerId,
    latestOrderId,
    googlePurchaseId: latestOrderId,
    googleSubscriptionState: googleState,
    status: isTrial && internalState === "active" ? "trial" : internalState,
    acknowledgementState,
    isAcknowledged:
      acknowledgementState === "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED",
    startTime,
    expiryTime,
    autoRenewEnabled,
    regionCode: response?.regionCode || null,
    externalAccountId:
      response?.externalAccountIdentifiers?.obfuscatedExternalAccountId || null,
    externalProfileId:
      response?.externalAccountIdentifiers?.obfuscatedExternalProfileId || null,
    lineItem,
    rawResponse: response,
    verificationTimeMs,
  };
};

const verifySubscriptionPurchase = async ({
  packageName,
  purchaseToken,
} = {}) => {
  if (!packageName || !purchaseToken) {
    throw new ApiError(400, "packageName and purchaseToken are required.", {
      code: "GOOGLE_SUBSCRIPTION_VERIFY_INPUT_REQUIRED",
    });
  }

  const startedAt = Date.now();
  const response = await authorizedRequest({
    method: "GET",
    path: `/applications/${encodeURIComponent(packageName)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`,
    packageName,
    productId: null,
  });
  const verificationTimeMs = Date.now() - startedAt;

  return normalizeSubscriptionResponse({
    packageName,
    purchaseToken,
    response,
    verificationTimeMs,
  });
};

const acknowledgeSubscriptionPurchase = async ({
  packageName,
  productId,
  purchaseToken,
  developerPayload = null,
} = {}) => {
  if (!packageName || !productId || !purchaseToken) {
    throw new ApiError(
      400,
      "packageName, productId, and purchaseToken are required.",
      {
        code: "GOOGLE_SUBSCRIPTION_ACK_INPUT_REQUIRED",
      },
    );
  }

  await authorizedRequest({
    method: "POST",
    path: `/applications/${encodeURIComponent(packageName)}/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`,
    body: developerPayload ? { developerPayload } : {},
    packageName,
    productId,
  });

  return { acknowledged: true };
};

const googleSubscriptionVerificationService = Object.freeze({
  verifySubscriptionPurchase,
  acknowledgeSubscriptionPurchase,
  mapGoogleSubscriptionState,
});

export default googleSubscriptionVerificationService;
