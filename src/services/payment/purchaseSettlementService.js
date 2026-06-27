import mongoose from "mongoose";
import PaymentModel from "../../models/Payment.js";
import walletValidationService from "../wallet/walletValidationService.js";
import walletService from "../wallet/walletService.js";

const coerceObject = (value) =>
  value && typeof value === "object" ? value : {};

const buildPaymentSeed = ({
  userId,
  walletId,
  packageConfig,
  verification,
  requestMeta = {},
  requestIdempotencyKey = null,
  paymentStatus = "success",
  purchaseState = null,
  verificationStatus = "verified",
  creditTransactionId = null,
  isRestore = false,
}) => ({
  user: userId,
  wallet: walletId,
  gateway: "google_play",
  platform: "google_play",
  paymentType: "credit_purchase",
  productType: packageConfig.productType || "inapp",
  productId: packageConfig.googlePlayProductId,
  packageName: verification.packageName || null,
  packageCode: packageConfig.code || null,
  purchaseToken: verification.purchaseToken || null,
  purchaseTokenHash: verification.purchaseTokenHash || null,
  orderId: verification.orderId || null,
  originalOrderId: verification.orderId || null,
  googlePurchaseId:
    verification.googlePurchaseId || verification.orderId || null,
  purchaseState: purchaseState || verification.purchaseState || "pending",
  verificationStatus,
  purchaseStateCode: verification.purchaseStateCode ?? null,
  acknowledgementStateCode: verification.acknowledgementStateCode ?? null,
  consumptionStateCode: verification.consumptionStateCode ?? null,
  purchaseTime: verification.purchaseTime || null,
  verifiedAt: new Date(),
  verificationTimeMs: verification.verificationTimeMs ?? null,
  acknowledgedAt: verification.isAcknowledged ? new Date() : null,
  consumedAt: verification.isConsumed ? new Date() : null,
  amount: Number(packageConfig.price || 0),
  baseAmount: Number(packageConfig.price || 0),
  taxAmount: 0,
  currency: packageConfig.currency || "USD",
  countryCode: verification.regionCode || null,
  quantity: verification.quantity ?? 1,
  refundableQuantity: verification.refundableQuantity ?? null,
  creditsPurchased: Number(
    packageConfig.totalCredits || packageConfig.credits || 0,
  ),
  status: paymentStatus,
  verificationAttempts: 1,
  verificationMessage: verification.verificationMessage || null,
  verificationPayload: {
    status: verificationStatus,
    packageConfig: {
      code: packageConfig.code || null,
      productId: packageConfig.googlePlayProductId || null,
      configuredPrice: Number(packageConfig.price || 0),
      configuredCurrency: packageConfig.currency || "USD",
      credits: Number(packageConfig.credits || 0),
      bonusCredits: Number(packageConfig.bonusCredits || 0),
    },
    googleResponse: verification.rawResponse || null,
  },
  requestId: requestMeta.requestId || null,
  requestIdempotencyKey: requestIdempotencyKey || null,
  ipAddress: requestMeta.ipAddress || null,
  userAgent: requestMeta.userAgent || null,
  clientDeviceId: requestMeta.clientDeviceId || null,
  deviceInfo: requestMeta.deviceInfo || null,
  creditTransaction: creditTransactionId || null,
  metadata: {
    restoreRequest: Boolean(isRestore),
    obfuscatedExternalAccountId:
      verification.obfuscatedExternalAccountId || null,
    obfuscatedExternalProfileId:
      verification.obfuscatedExternalProfileId || null,
    purchaseType: verification.purchaseType ?? null,
    developerPayload: verification.developerPayload || null,
    packageCountries: Array.isArray(packageConfig.countries)
      ? packageConfig.countries
      : [],
    packageMetadata: coerceObject(packageConfig.metadata),
  },
});

const createPaymentDocument = async ({ session, paymentSeed }) => {
  const docs = await PaymentModel.create([paymentSeed], { session });
  return docs[0];
};

const settleVerifiedCreditPurchase = async ({
  userId,
  packageConfig,
  verification,
  requestMeta = {},
  requestIdempotencyKey = null,
  walletId = null,
  existingPayment = null,
  settlementIdempotencyKey,
  isRestore = false,
} = {}) => {
  const session = await mongoose.startSession();

  try {
    let result = null;
    await session.withTransaction(async () => {
      const wallet = walletId
        ? await walletValidationService.getWalletByUserId({ userId, session })
        : await walletValidationService.getWalletByUserId({ userId, session });

      let payment = existingPayment?._id
        ? await PaymentModel.findById(existingPayment._id).session(session)
        : null;
      const hadExistingPayment = Boolean(payment);

      if (payment?.status === "success" && payment?.creditTransaction) {
        result = {
          payment,
          wallet: null,
          transaction: null,
          alreadyProcessed: true,
        };
        return;
      }

      if (!payment) {
        const paymentSeed = buildPaymentSeed({
          userId,
          walletId: wallet._id,
          packageConfig,
          verification,
          requestMeta,
          requestIdempotencyKey,
          paymentStatus: "pending",
          purchaseState: verification.purchaseState,
          verificationStatus: "verified",
          creditTransactionId: null,
          isRestore,
        });
        payment = await createPaymentDocument({ session, paymentSeed });
      }

      const walletMutation = await walletService.addCredits({
        userId,
        credits: Number(
          packageConfig.totalCredits || packageConfig.credits || 0,
        ),
        type: "purchase",
        source: "GooglePlay",
        purpose: isRestore ? "google_play_restore" : "google_play_purchase",
        description: `Google Play credit purchase settled for ${packageConfig.code || packageConfig.googlePlayProductId || "package"}.`,
        referenceType: "Payment",
        referenceId: payment._id,
        idempotencyKey: settlementIdempotencyKey,
        session,
      });

      const previousAttempts = hadExistingPayment
        ? Number(payment.verificationAttempts || 0)
        : 0;
      payment.set(
        buildPaymentSeed({
          userId,
          walletId: wallet._id,
          packageConfig,
          verification,
          requestMeta,
          requestIdempotencyKey,
          paymentStatus: "success",
          purchaseState: verification.purchaseState,
          verificationStatus: "verified",
          creditTransactionId:
            walletMutation.transaction?._id ||
            payment.creditTransaction ||
            null,
          isRestore,
        }),
      );
      payment.verificationAttempts = Math.max(previousAttempts + 1, 1);
      payment.restoredAt = isRestore ? new Date() : payment.restoredAt;
      payment.processedBy = userId;
      await payment.save({ session });

      result = {
        payment,
        wallet: walletMutation.wallet || null,
        transaction: walletMutation.transaction || null,
        alreadyProcessed: false,
      };
    });

    return result;
  } finally {
    await session.endSession();
  }
};

const markPaymentPostActions = async ({
  paymentId,
  isAcknowledged = null,
  isConsumed = null,
  requestMeta = {},
} = {}) => {
  const update = {
    ...(isAcknowledged === null
      ? {}
      : {
          isAcknowledged: Boolean(isAcknowledged),
          acknowledgedAt: isAcknowledged ? new Date() : null,
        }),
    ...(isConsumed === null
      ? {}
      : {
          isConsumed: Boolean(isConsumed),
          consumedAt: isConsumed ? new Date() : null,
        }),
  };

  if (Object.keys(update).length === 0) {
    return null;
  }

  return PaymentModel.findByIdAndUpdate(
    paymentId,
    {
      $set: {
        ...update,
        ipAddress: requestMeta.ipAddress || undefined,
        userAgent: requestMeta.userAgent || undefined,
      },
    },
    { new: true },
  );
};

const purchaseSettlementService = Object.freeze({
  settleVerifiedCreditPurchase,
  markPaymentPostActions,
});

export default purchaseSettlementService;
