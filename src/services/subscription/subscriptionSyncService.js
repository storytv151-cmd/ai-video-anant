import mongoose from "mongoose";
import UserModel from "../../models/User.js";
import ApiError from "../../utils/ApiError.js";
import paymentAuditService from "../payment/paymentAuditService.js";
import paymentSettingsService from "../payment/paymentSettingsService.js";
import googleSubscriptionVerificationService from "./googleSubscriptionVerificationService.js";
import subscriptionFraudService from "./subscriptionFraudService.js";
import subscriptionRenewalService from "./subscriptionRenewalService.js";
import subscriptionService from "./subscriptionService.js";

const buildRequestMeta = ({ request = null, payload = {} } = {}) => ({
  requestId: request?.requestId || null,
  ipAddress: request?.ip || null,
  userAgent: request?.headers?.["user-agent"] || null,
  clientDeviceId:
    payload.clientDeviceId ||
    payload.deviceId ||
    request?.headers?.["x-device-id"] ||
    null,
  deviceInfo: payload.device || payload.deviceInfo || null,
});

const resolveVerificationIntervalMinutes = (settings) =>
  Number(
    settings?.googlePlay?.subscriptionVerificationIntervalMinutes ||
      settings?.googlePlay?.verificationIntervalMinutes ||
      180,
  );

const buildNextVerificationAt = (settings) => {
  const minutes = resolveVerificationIntervalMinutes(settings);
  return new Date(Date.now() + minutes * 60 * 1000);
};

const shouldSynchronizeNow = ({
  subscription = {},
  settings,
  force = false,
} = {}) => {
  if (force) {
    return true;
  }
  if (!settings?.googlePlay?.subscriptionSyncEnabled) {
    return false;
  }
  if (!settings?.googlePlay?.subscriptionSyncOnAppOpen) {
    return false;
  }
  if (!subscription?.platform || subscription.platform !== "google_play") {
    return false;
  }
  if (!subscription?.purchaseToken) {
    return false;
  }
  if (!subscription?.lastVerifiedAt) {
    return true;
  }
  const nextVerificationAt = subscription.nextVerificationAt
    ? new Date(subscription.nextVerificationAt)
    : null;
  if (nextVerificationAt && !Number.isNaN(nextVerificationAt.getTime())) {
    return nextVerificationAt.getTime() <= Date.now();
  }
  const intervalMs = resolveVerificationIntervalMinutes(settings) * 60 * 1000;
  return (
    new Date(subscription.lastVerifiedAt).getTime() + intervalMs <= Date.now()
  );
};

const resolveUserByVerification = async ({
  purchaseTokenHash,
  externalAccountId,
  externalProfileId,
} = {}) => {
  let user = null;

  if (purchaseTokenHash) {
    user = await UserModel.findOne({
      $or: [
        { "subscription.purchaseTokenHash": purchaseTokenHash },
        { "subscription.linkedPurchaseTokenHash": purchaseTokenHash },
      ],
    });
  }

  if (!user && externalAccountId) {
    user =
      (mongoose.isValidObjectId(externalAccountId)
        ? await UserModel.findById(externalAccountId)
        : null) ||
      (await UserModel.findOne({
        "subscription.externalAccountId": externalAccountId,
      }));
  }

  if (!user && externalProfileId) {
    user = await UserModel.findOne({
      $or: [
        { "subscription.externalProfileId": externalProfileId },
        { googleId: externalProfileId },
      ],
    });
  }

  return user;
};

const applyPostVerificationActions = async ({
  settings,
  verification,
} = {}) => {
  if (
    settings?.googlePlay?.requireAcknowledgement &&
    !verification.isAcknowledged &&
    verification.productId
  ) {
    await googleSubscriptionVerificationService.acknowledgeSubscriptionPurchase(
      {
        packageName: verification.packageName,
        productId: verification.productId,
        purchaseToken: verification.purchaseToken,
      },
    );
    verification.isAcknowledged = true;
    verification.acknowledgementState = "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED";
  }
};

const verifySubscriptionForUser = async ({
  userId,
  payload = {},
  request = null,
  idempotencyKey = null,
  syncReason = "verify",
  notification = null,
} = {}) => {
  const settings = await paymentSettingsService.getPaymentSettings();
  paymentSettingsService.assertPaymentsEnabled(settings);
  paymentSettingsService.assertGooglePlayEnabled(settings);

  if (!settings.googlePlay?.allowSubscriptions) {
    throw new ApiError(403, "Subscriptions are disabled.", {
      code: "GOOGLE_PLAY_SUBSCRIPTIONS_DISABLED",
    });
  }

  const packageName = subscriptionFraudService.assertPackageAllowed({
    settings,
    packageName: payload.packageName,
  });
  if (!payload.purchaseToken) {
    throw new ApiError(400, "purchaseToken is required.", {
      code: "GOOGLE_SUBSCRIPTION_PURCHASE_TOKEN_REQUIRED",
    });
  }

  const verification =
    await googleSubscriptionVerificationService.verifySubscriptionPurchase({
      packageName,
      purchaseToken: payload.purchaseToken,
    });
  verification.purchaseTokenHash = subscriptionFraudService.hashPurchaseToken(
    payload.purchaseToken,
  );
  verification.linkedPurchaseTokenHash =
    subscriptionFraudService.hashPurchaseToken(
      verification.linkedPurchaseToken,
    );
  verification.nextVerificationAt = buildNextVerificationAt(settings);

  const plan = paymentSettingsService.findSubscriptionPlanByProductId({
    settings,
    productId: verification.productId,
    basePlanId: verification.basePlanId,
  });
  subscriptionFraudService.assertPlanMatchesVerification({
    plan,
    verification,
  });
  subscriptionFraudService.assertCountryAllowed({
    plan,
    regionCode: verification.regionCode,
  });
  await subscriptionFraudService.assertOwnership({
    userId,
    purchaseTokenHash: verification.purchaseTokenHash,
    externalAccountId: verification.externalAccountId,
    externalProfileId: verification.externalProfileId,
  });

  if (payload.productId && payload.productId !== verification.productId) {
    throw new ApiError(
      400,
      "Subscription product does not match Google verification response.",
      {
        code: "GOOGLE_SUBSCRIPTION_PRODUCT_MISMATCH",
      },
    );
  }

  await applyPostVerificationActions({ settings, verification });

  const requestMeta = buildRequestMeta({ request, payload });
  const synchronized =
    await subscriptionRenewalService.synchronizeVerifiedSubscription({
      userId,
      plan,
      verification,
      requestMeta,
      request,
      idempotencyKey,
      syncReason,
      notification,
    });

  await paymentAuditService
    .logEvent({
      action: notification
        ? "SUBSCRIPTION_GOOGLE_SYNCED"
        : "SUBSCRIPTION_GOOGLE_VERIFIED",
      actorUserId: userId,
      targetId:
        synchronized.payment?._id ||
        synchronized.currentSubscription?.payment ||
        null,
      request,
      metadata: {
        plan: plan.code,
        productId: verification.productId,
        orderId: verification.latestOrderId,
        status: synchronized.status,
        syncReason,
        notificationId: notification?.notificationId || null,
        notificationType: notification?.notificationTypeLabel || null,
      },
    })
    .catch(() => null);

  return {
    verified: true,
    syncReason,
    paymentId: synchronized.payment?._id || null,
    subscription: synchronized.currentSubscription,
    google: {
      productId: verification.productId,
      latestOrderId: verification.latestOrderId,
      acknowledgementState: verification.acknowledgementState,
      subscriptionState: verification.googleSubscriptionState,
      expiryTime: verification.expiryTime,
      regionCode: verification.regionCode,
      verificationTimeMs: verification.verificationTimeMs,
    },
  };
};

const synchronizeStoredSubscription = async ({
  userId,
  force = false,
  request = null,
  reason = "app_open",
} = {}) => {
  const settings = await paymentSettingsService.getPaymentSettings();
  const user = await UserModel.findById(userId)
    .select({ subscription: 1 })
    .lean();
  if (!user) {
    throw new ApiError(404, "User not found.", { code: "USER_NOT_FOUND" });
  }

  if (
    !shouldSynchronizeNow({ subscription: user.subscription, settings, force })
  ) {
    return subscriptionService.buildCurrentSubscriptionResponse({ userId });
  }

  if (!user.subscription?.purchaseToken) {
    return subscriptionService.buildCurrentSubscriptionResponse({ userId });
  }

  const result = await verifySubscriptionForUser({
    userId,
    payload: {
      purchaseToken: user.subscription.purchaseToken,
      packageName: settings.googlePlay?.packageName || null,
      productId: user.subscription.productId || null,
      deviceInfo: { trigger: reason },
    },
    request,
    idempotencyKey: request?.idempotencyKey || null,
    syncReason: reason,
  });

  return result.subscription;
};

const getVerifiedStatus = async ({
  userId,
  request = null,
  force = false,
} = {}) => {
  const data = await synchronizeStoredSubscription({
    userId,
    force,
    request,
    reason: force ? "status_force" : "status_check",
  });
  return data;
};

const synchronizeByPurchaseToken = async ({
  purchaseToken,
  packageName = null,
  request = null,
  notification = null,
  forceUserId = null,
  syncReason = "rtdn",
} = {}) => {
  const settings = await paymentSettingsService.getPaymentSettings();
  const resolvedPackageName = subscriptionFraudService.assertPackageAllowed({
    settings,
    packageName,
  });
  const verification =
    await googleSubscriptionVerificationService.verifySubscriptionPurchase({
      packageName: resolvedPackageName,
      purchaseToken,
    });
  verification.purchaseTokenHash =
    subscriptionFraudService.hashPurchaseToken(purchaseToken);
  verification.linkedPurchaseTokenHash =
    subscriptionFraudService.hashPurchaseToken(
      verification.linkedPurchaseToken,
    );
  verification.nextVerificationAt = buildNextVerificationAt(settings);

  const user =
    (forceUserId ? await UserModel.findById(forceUserId) : null) ||
    (await resolveUserByVerification({
      purchaseTokenHash: verification.purchaseTokenHash,
      externalAccountId: verification.externalAccountId,
      externalProfileId: verification.externalProfileId,
    }));

  if (!user) {
    throw new ApiError(
      404,
      "Unable to map Google subscription to a local user.",
      {
        code: "SUBSCRIPTION_USER_MAPPING_NOT_FOUND",
        details: {
          productId: verification.productId,
          purchaseTokenHash: verification.purchaseTokenHash,
        },
      },
    );
  }

  const plan = paymentSettingsService.findSubscriptionPlanByProductId({
    settings,
    productId: verification.productId,
    basePlanId: verification.basePlanId,
  });
  subscriptionFraudService.assertPlanMatchesVerification({
    plan,
    verification,
  });
  subscriptionFraudService.assertCountryAllowed({
    plan,
    regionCode: verification.regionCode,
  });
  await subscriptionFraudService.assertOwnership({
    userId: user._id,
    purchaseTokenHash: verification.purchaseTokenHash,
    externalAccountId: verification.externalAccountId,
    externalProfileId: verification.externalProfileId,
  });
  await applyPostVerificationActions({ settings, verification });

  const requestMeta = buildRequestMeta({ request, payload: {} });
  const synchronized =
    await subscriptionRenewalService.synchronizeVerifiedSubscription({
      userId: user._id,
      plan,
      verification,
      requestMeta,
      request,
      idempotencyKey:
        request?.idempotencyKey || notification?.notificationId || null,
      syncReason,
      notification,
    });

  return {
    userId: user._id,
    subscription: synchronized.currentSubscription,
    paymentId: synchronized.payment?._id || null,
    verification,
  };
};

const subscriptionSyncService = Object.freeze({
  verifySubscriptionForUser,
  synchronizeStoredSubscription,
  getVerifiedStatus,
  synchronizeByPurchaseToken,
  shouldSynchronizeNow,
  buildNextVerificationAt,
});

export default subscriptionSyncService;
