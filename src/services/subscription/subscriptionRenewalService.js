import PaymentModel from "../../models/Payment.js";
import UserModel from "../../models/User.js";
import ApiError from "../../utils/ApiError.js";
import subscriptionService from "./subscriptionService.js";
import membershipService from "./membershipService.js";

const ENTITLED_STATUSES = Object.freeze([
  "active",
  "trial",
  "grace_period",
  "renewed",
]);

const hasEntitlement = ({ status, expiresAt }) => {
  if (ENTITLED_STATUSES.includes(status)) {
    return true;
  }
  if (status === "cancelled" && expiresAt) {
    const expiry = new Date(expiresAt);
    return !Number.isNaN(expiry.getTime()) && expiry.getTime() > Date.now();
  }
  return false;
};

const deriveSynchronizedStatus = ({ verification, syncReason }) => {
  const normalizedStatus = String(verification?.status || "pending")
    .trim()
    .toLowerCase();

  switch (
    String(syncReason || "")
      .trim()
      .toLowerCase()
  ) {
    case "renewal":
      return normalizedStatus === "active" ? "renewed" : normalizedStatus;
    case "rtdn_cancel":
      return "cancelled";
    case "rtdn_pause":
      return "paused";
    case "rtdn_on_hold":
      return "on_hold";
    case "rtdn_grace_period":
      return "grace_period";
    case "rtdn_revoke":
      return "revoked";
    case "rtdn_expire":
      return "expired";
    default:
      return normalizedStatus;
  }
};

const pickHistoryEvent = ({ syncReason, status }) => {
  if (syncReason === "restore") {
    return "resume";
  }
  if (syncReason === "renewal" || status === "renewed") {
    return "renew";
  }
  if (syncReason === "rtdn_cancel") {
    return "cancel";
  }
  if (syncReason === "rtdn_pause") {
    return "pause";
  }
  if (syncReason === "rtdn_resume" || syncReason === "rtdn_recovered") {
    return "resume";
  }
  if (
    syncReason === "rtdn_expire" ||
    status === "expired" ||
    status === "revoked"
  ) {
    return "expire";
  }
  if (status === "trial") {
    return "trial";
  }
  return "renew";
};

const buildFeatureSnapshot = ({ plan, featureCatalog, status, expiresAt }) => {
  if (!hasEntitlement({ status, expiresAt })) {
    const featureCatalogSet = Array.isArray(featureCatalog)
      ? featureCatalog
      : [];
    return Object.fromEntries(
      featureCatalogSet.map((featureName) => [featureName, false]),
    );
  }
  return membershipService.buildFeatureSnapshot({ plan, featureCatalog });
};

const upsertSubscriptionPaymentRecord = async ({
  user,
  plan,
  verification,
  status,
  requestMeta = {},
  existingPaymentId = null,
  idempotencyKey = null,
  syncReason = "verify",
}) => {
  const lookup = [];
  if (existingPaymentId) {
    lookup.push({ _id: existingPaymentId });
  }
  if (verification.purchaseTokenHash) {
    lookup.push({
      platform: "google_play",
      purchaseTokenHash: verification.purchaseTokenHash,
    });
  }
  if (verification.latestOrderId) {
    lookup.push({
      platform: "google_play",
      orderId: verification.latestOrderId,
    });
    lookup.push({
      platform: "google_play",
      googlePurchaseId: verification.latestOrderId,
    });
  }

  let payment =
    lookup.length > 0 ? await PaymentModel.findOne({ $or: lookup }) : null;
  if (!payment) {
    payment = new PaymentModel({
      user: user._id,
      wallet: user.wallet,
      gateway: "google_play",
      platform: "google_play",
      paymentType: "subscription",
      productType: "subs",
      amount: Number(plan.price || 0),
      currency: plan.currency || "USD",
      creditsPurchased: 0,
    });
  }

  payment.user = user._id;
  payment.wallet = user.wallet;
  payment.gateway = "google_play";
  payment.platform = "google_play";
  payment.paymentType = "subscription";
  payment.productType = "subs";
  payment.productId =
    verification.productId || plan.googlePlayProductId || null;
  payment.packageName = verification.packageName || null;
  payment.subscriptionPlanCode = plan.code || null;
  payment.purchaseToken = verification.purchaseToken || null;
  payment.purchaseTokenHash = verification.purchaseTokenHash || null;
  payment.orderId = verification.latestOrderId || null;
  payment.originalOrderId =
    payment.originalOrderId || verification.latestOrderId || null;
  payment.googlePurchaseId = verification.latestOrderId || null;
  payment.purchaseState = status;
  payment.verificationStatus = "verified";
  payment.purchaseTime = verification.startTime || payment.purchaseTime || null;
  payment.verifiedAt = new Date();
  payment.expiresAt = verification.expiryTime || null;
  payment.autoRenew = Boolean(verification.autoRenewEnabled);
  payment.isAcknowledged = Boolean(verification.isAcknowledged);
  payment.amount = Number(plan.price || 0);
  payment.baseAmount = Number(plan.price || 0);
  payment.taxAmount = 0;
  payment.currency = plan.currency || "USD";
  payment.countryCode = verification.regionCode || null;
  payment.creditsPurchased = 0;
  payment.status = ["expired", "revoked"].includes(status)
    ? "cancelled"
    : "success";
  payment.verificationAttempts = Number(payment.verificationAttempts || 0) + 1;
  payment.verificationMessage = `Google subscription synchronized via ${syncReason}.`;
  payment.verificationPayload = {
    status: "verified",
    syncReason,
    subscriptionPlan: {
      code: plan.code || null,
      productId: plan.googlePlayProductId || null,
      basePlanId: plan.basePlanId || null,
      offerId: plan.offerId || null,
      configuredPrice: Number(plan.price || 0),
      configuredCurrency: plan.currency || "USD",
    },
    googleResponse: verification.rawResponse || null,
  };
  payment.requestId = requestMeta.requestId || null;
  payment.requestIdempotencyKey = idempotencyKey || null;
  payment.ipAddress = requestMeta.ipAddress || null;
  payment.userAgent = requestMeta.userAgent || null;
  payment.clientDeviceId = requestMeta.clientDeviceId || null;
  payment.deviceInfo = requestMeta.deviceInfo || null;
  payment.metadata = {
    ...(payment.metadata instanceof Map
      ? Object.fromEntries(payment.metadata.entries())
      : payment.metadata || {}),
    subscriptionSyncReason: syncReason,
    externalAccountId: verification.externalAccountId || null,
    externalProfileId: verification.externalProfileId || null,
    basePlanId: verification.basePlanId || null,
    offerId: verification.offerId || null,
  };

  await payment.save();
  return payment;
};

const synchronizeVerifiedSubscription = async ({
  userId,
  plan,
  verification,
  requestMeta = {},
  request: _request = null,
  idempotencyKey = null,
  syncReason = "verify",
  notification = null,
  paymentId = null,
} = {}) => {
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found.", { code: "USER_NOT_FOUND" });
  }
  if (!user.wallet) {
    throw new ApiError(
      409,
      "Wallet not found for subscription synchronization.",
      {
        code: "SUBSCRIPTION_WALLET_REQUIRED",
      },
    );
  }

  const status = deriveSynchronizedStatus({ verification, syncReason });
  const config = await membershipService.getMembershipConfig();
  const featureSnapshot = buildFeatureSnapshot({
    plan,
    featureCatalog: config.membershipSettings.featureCatalog,
    status,
    expiresAt: verification.expiryTime,
  });

  const payment = await upsertSubscriptionPaymentRecord({
    user,
    plan,
    verification,
    status,
    requestMeta,
    existingPaymentId: paymentId || user.subscription?.payment || null,
    idempotencyKey,
    syncReason,
  });

  const historyEvent = pickHistoryEvent({ syncReason, status });
  const metadata = {
    googleSubscriptionState: verification.googleSubscriptionState || null,
    acknowledgementState: verification.acknowledgementState || null,
    latestOrderId: verification.latestOrderId || null,
    notificationId: notification?.notificationId || null,
    notificationType: notification?.notificationTypeLabel || null,
    syncReason,
  };

  await subscriptionService.upsertSubscriptionState({
    userId: user._id,
    transitionType: historyEvent,
    targetPlanCode: plan.code,
    status,
    triggeredBy: notification ? "google_rtdn" : "google_play",
    expiresAt: verification.expiryTime || null,
    autoRenew: verification.autoRenewEnabled,
    paymentId: payment._id,
    metadata: {
      ...metadata,
      source: "google_play",
      platform: "google_play",
      productId: verification.productId || null,
      basePlanId: verification.basePlanId || null,
      offerId: verification.offerId || null,
      orderId: verification.latestOrderId || null,
      purchaseToken: verification.purchaseToken || null,
      purchaseTokenHash: verification.purchaseTokenHash || null,
      linkedPurchaseToken: verification.linkedPurchaseToken || null,
      linkedPurchaseTokenHash: verification.linkedPurchaseTokenHash || null,
      latestOrderId: verification.latestOrderId || null,
      googleSubscriptionState: verification.googleSubscriptionState || null,
      acknowledgementState: verification.acknowledgementState || null,
      regionCode: verification.regionCode || null,
      externalAccountId: verification.externalAccountId || null,
      externalProfileId: verification.externalProfileId || null,
      lastVerifiedAt: new Date(),
      nextVerificationAt: verification.nextVerificationAt || null,
      lastSyncedAt: new Date(),
      latestNotificationId: notification?.notificationId || null,
      latestNotificationType: notification?.notificationTypeLabel || null,
      latestNotificationAt: notification?.eventTime || null,
      featureSnapshotOverride: featureSnapshot,
      premiumFeaturesOverride: hasEntitlement({
        status,
        expiresAt: verification.expiryTime,
      })
        ? plan.premiumFeatures || []
        : [],
      limitsSnapshotOverride: hasEntitlement({
        status,
        expiresAt: verification.expiryTime,
      })
        ? plan.limits || {}
        : {},
    },
  });

  return {
    payment,
    status,
    currentSubscription:
      await subscriptionService.buildCurrentSubscriptionResponse({
        userId: user._id,
      }),
  };
};

const subscriptionRenewalService = Object.freeze({
  hasEntitlement,
  deriveSynchronizedStatus,
  synchronizeVerifiedSubscription,
});

export default subscriptionRenewalService;
