import ApiError from '../../utils/ApiError.js';
import { buildPaymentDetailDto } from '../../utils/payment.dto.js';
import googlePlayVerificationService from './googlePlayVerificationService.js';
import paymentAuditService from './paymentAuditService.js';
import paymentSettingsService from './paymentSettingsService.js';
import purchaseDuplicateProtectionService from './purchaseDuplicateProtectionService.js';
import purchaseSettlementService from './purchaseSettlementService.js';
import purchaseStateService from './purchaseStateService.js';

const assertCreditPurchaseRequest = (payload = {}) => {
  if (payload.paymentType && payload.paymentType !== 'credit_purchase') {
    throw new ApiError(501, 'Subscription verification is not implemented in this phase.', {
      code: 'SUBSCRIPTION_PAYMENT_NOT_IMPLEMENTED',
    });
  }
  if (payload.productType && payload.productType !== 'inapp') {
    throw new ApiError(400, 'Only one-time in-app products are supported in this phase.', {
      code: 'GOOGLE_PLAY_PRODUCT_TYPE_INVALID',
    });
  }
};

const resolvePackageName = ({ payload, settings }) => {
  const requested = String(payload.packageName || '').trim();
  const allowed = paymentSettingsService.resolveAllowedPackageNames(settings);
  if (requested && allowed.length > 0 && !allowed.includes(requested)) {
    throw new ApiError(400, 'Package name does not match configured Google Play application.', {
      code: 'GOOGLE_PLAY_PACKAGE_MISMATCH',
      details: { packageName: requested },
    });
  }

  const resolved = requested || allowed[0] || null;
  if (!resolved) {
    throw new ApiError(500, 'Google Play package name is not configured.', { code: 'GOOGLE_PLAY_PACKAGE_NOT_CONFIGURED' });
  }
  return resolved;
};

const ensureVerifiableState = ({ verification, existingPayment = null }) => {
  const state = purchaseStateService.normalizePurchaseState(verification.purchaseState);

  if (state === 'pending') {
    throw new ApiError(409, 'Purchase is still pending in Google Play.', {
      code: 'GOOGLE_PLAY_PURCHASE_PENDING',
      details: { purchaseState: state },
    });
  }
  if (state === 'cancelled') {
    throw new ApiError(409, 'Purchase has been cancelled in Google Play.', {
      code: 'GOOGLE_PLAY_PURCHASE_CANCELLED',
      details: { purchaseState: state },
    });
  }
  if (['refunded', 'revoked', 'expired', 'failed'].includes(state)) {
    throw new ApiError(409, `Purchase is not payable because it is ${state}.`, {
      code: 'GOOGLE_PLAY_PURCHASE_NOT_SETTLABLE',
      details: { purchaseState: state },
    });
  }
  if (verification.isConsumed && !(existingPayment?.status === 'success')) {
    throw new ApiError(409, 'Purchase is already consumed and cannot be granted again.', {
      code: 'GOOGLE_PLAY_PURCHASE_ALREADY_CONSUMED',
      details: { purchaseState: state },
    });
  }
};

const validateAgainstConfiguration = ({ payload, verification, packageConfig }) => {
  if (!packageConfig) {
    throw new ApiError(400, 'Requested product is not configured for purchase.', {
      code: 'GOOGLE_PLAY_PRODUCT_NOT_CONFIGURED',
    });
  }

  if (packageConfig.productType !== 'inapp') {
    throw new ApiError(400, 'Only one-time credit packages are supported in this phase.', {
      code: 'GOOGLE_PLAY_PRODUCT_TYPE_INVALID',
    });
  }

  if (verification.productId !== packageConfig.googlePlayProductId) {
    throw new ApiError(400, 'Google Play product does not match configured package.', {
      code: 'GOOGLE_PLAY_PRODUCT_MISMATCH',
      details: {
        expected: packageConfig.googlePlayProductId,
        actual: verification.productId,
      },
    });
  }

  const requestedOrderId = purchaseDuplicateProtectionService.normalizeString(payload.orderId);
  if (requestedOrderId && verification.orderId && requestedOrderId !== verification.orderId) {
    throw new ApiError(400, 'Order ID does not match Google Play verification result.', {
      code: 'GOOGLE_PLAY_ORDER_ID_MISMATCH',
      details: {
        expected: requestedOrderId,
        actual: verification.orderId,
      },
    });
  }

  if (Array.isArray(packageConfig.countries) && packageConfig.countries.length > 0 && verification.regionCode) {
    const allowedCountries = packageConfig.countries.map((item) => String(item).trim().toUpperCase()).filter(Boolean);
    if (allowedCountries.length > 0 && !allowedCountries.includes(String(verification.regionCode).toUpperCase())) {
      throw new ApiError(400, 'Purchase country is not allowed for this package.', {
        code: 'GOOGLE_PLAY_COUNTRY_MISMATCH',
        details: {
          expectedCountries: allowedCountries,
          actualCountry: verification.regionCode,
        },
      });
    }
  }
};

const buildRequestMeta = ({ request = null, payload = {} } = {}) => ({
  requestId: request?.requestId || null,
  ipAddress: request?.ip || null,
  userAgent: request?.headers?.['user-agent'] || null,
  clientDeviceId: payload.clientDeviceId || payload.deviceId || request?.headers?.['x-device-id'] || null,
  deviceInfo: payload.device || payload.deviceInfo || null,
});

const maybeRunPostActions = async ({ settings, verification, payment, requestMeta }) => {
  const actions = {
    acknowledged: verification.isAcknowledged,
    consumed: verification.isConsumed,
    warnings: [],
    updatedPayment: payment || null,
  };

  if (!payment?._id) {
    return actions;
  }

  if (settings?.googlePlay?.requireAcknowledgement && !verification.isAcknowledged && purchaseStateService.canAcknowledgePurchase(verification.purchaseState)) {
    try {
      await googlePlayVerificationService.acknowledgeInAppPurchase({
        packageName: verification.packageName,
        productId: verification.productId,
        purchaseToken: verification.purchaseToken,
        developerPayload: verification.developerPayload,
      });
      actions.acknowledged = true;
    } catch (error) {
      actions.warnings.push({
        action: 'acknowledge',
        code: error.code || 'GOOGLE_PLAY_ACK_FAILED',
        message: error.message,
      });
    }
  }

  if (settings?.googlePlay?.consumeOneTimePurchases && !verification.isConsumed && purchaseStateService.canConsumePurchase(verification.purchaseState)) {
    try {
      await googlePlayVerificationService.consumeInAppPurchase({
        packageName: verification.packageName,
        productId: verification.productId,
        purchaseToken: verification.purchaseToken,
      });
      actions.consumed = true;
    } catch (error) {
      actions.warnings.push({
        action: 'consume',
        code: error.code || 'GOOGLE_PLAY_CONSUME_FAILED',
        message: error.message,
      });
    }
  }

  const updatedPayment = await purchaseSettlementService.markPaymentPostActions({
    paymentId: payment._id,
    isAcknowledged: actions.acknowledged,
    isConsumed: actions.consumed,
    requestMeta,
  });
  actions.updatedPayment = updatedPayment || payment || null;

  return actions;
};

const buildExistingResponse = ({ existingPayment }) => ({
  payment: buildPaymentDetailDto(existingPayment),
  wallet: null,
  creditTransactionId: existingPayment.creditTransaction || null,
  alreadyProcessed: true,
  grantedCredits: false,
  duplicateDetected: true,
  googlePostActions: null,
});

const verifyAndSettleCreditPurchase = async ({
  userId,
  payload = {},
  request = null,
  idempotencyKey = null,
  isRestore = false,
} = {}) => {
  try {
    assertCreditPurchaseRequest(payload);

    const settings = await paymentSettingsService.getPaymentSettings();
    paymentSettingsService.assertPaymentsEnabled(settings);
    paymentSettingsService.assertGooglePlayEnabled(settings);
    if (!settings.googlePlay?.allowCreditPurchases) {
      throw new ApiError(403, 'Credit purchases are disabled.', { code: 'GOOGLE_PLAY_CREDIT_PURCHASES_DISABLED' });
    }

    const packageConfig = paymentSettingsService.findCreditPackageByProductId({
      settings,
      productId: payload.productId,
    });
    if (!packageConfig) {
      throw new ApiError(400, 'Requested product is not configured for Google Play purchases.', {
        code: 'GOOGLE_PLAY_PRODUCT_NOT_CONFIGURED',
        details: { productId: payload.productId || null },
      });
    }

    const packageName = resolvePackageName({ payload, settings });
    const purchaseTokenHash = purchaseDuplicateProtectionService.hashPurchaseToken(payload.purchaseToken);
    const requestMeta = buildRequestMeta({ request, payload });

    const existingBeforeVerification = await purchaseDuplicateProtectionService.findExistingPayment({
      userId,
      purchaseTokenHash,
      orderId: purchaseDuplicateProtectionService.normalizeString(payload.orderId),
      requestIdempotencyKey: idempotencyKey || null,
    });

    if (existingBeforeVerification?.status === 'success' && existingBeforeVerification?.creditTransaction) {
      return buildExistingResponse({ existingPayment: existingBeforeVerification.toObject?.() || existingBeforeVerification });
    }

    const verification = await googlePlayVerificationService.verifyInAppPurchase({
      packageName,
      productId: packageConfig.googlePlayProductId,
      purchaseToken: payload.purchaseToken,
    });
    verification.packageName = packageName;
    verification.purchaseTokenHash = purchaseTokenHash;

    validateAgainstConfiguration({ payload, verification, packageConfig });

    const existingAfterVerification = await purchaseDuplicateProtectionService.findExistingPayment({
      userId,
      purchaseTokenHash,
      orderId: verification.orderId,
      googlePurchaseId: verification.googlePurchaseId,
      requestIdempotencyKey: idempotencyKey || null,
    });

    if (existingAfterVerification?.status === 'success' && existingAfterVerification?.creditTransaction) {
      return buildExistingResponse({ existingPayment: existingAfterVerification.toObject?.() || existingAfterVerification });
    }

    ensureVerifiableState({
      verification,
      existingPayment: existingAfterVerification || existingBeforeVerification || null,
    });

    const settlementIdempotencyKey = isRestore
      ? purchaseDuplicateProtectionService.buildRestoreIdempotencyKey({
          purchaseTokenHash,
          orderId: verification.orderId,
          googlePurchaseId: verification.googlePurchaseId,
        })
      : purchaseDuplicateProtectionService.buildSettlementIdempotencyKey({
          purchaseTokenHash,
          orderId: verification.orderId,
          googlePurchaseId: verification.googlePurchaseId,
        });

    let settled;
    try {
      settled = await purchaseSettlementService.settleVerifiedCreditPurchase({
        userId,
        packageConfig,
        verification,
        requestMeta,
        requestIdempotencyKey: idempotencyKey || null,
        existingPayment: existingAfterVerification || existingBeforeVerification || null,
        settlementIdempotencyKey,
        isRestore,
      });
    } catch (error) {
      if (error?.code === 11000) {
        const existingOnConflict = await purchaseDuplicateProtectionService.findExistingPayment({
          userId,
          purchaseTokenHash,
          orderId: verification.orderId,
          googlePurchaseId: verification.googlePurchaseId,
          requestIdempotencyKey: idempotencyKey || null,
        });
        if (existingOnConflict) {
          return buildExistingResponse({ existingPayment: existingOnConflict.toObject?.() || existingOnConflict });
        }
      }
      throw error;
    }

    const payment = settled?.payment?.toObject?.() || settled?.payment || null;
    const googlePostActions = await maybeRunPostActions({
      settings,
      verification,
      payment,
      requestMeta,
    });
    const responsePayment = googlePostActions.updatedPayment?.toObject?.() || googlePostActions.updatedPayment || payment;
    const postActionSummary = {
      acknowledged: googlePostActions.acknowledged,
      consumed: googlePostActions.consumed,
      warnings: googlePostActions.warnings,
    };

    await paymentAuditService.logEvent({
      action: isRestore ? 'PAYMENT_RESTORE_SETTLED' : 'PAYMENT_GOOGLE_VERIFIED',
      actorUserId: userId,
      targetId: payment?._id || null,
      request,
      metadata: {
        productId: verification.productId || null,
        orderId: verification.orderId || null,
        packageCode: packageConfig.code || null,
        creditsGranted: Number(packageConfig.totalCredits || packageConfig.credits || 0),
        alreadyProcessed: Boolean(settled?.alreadyProcessed),
        googlePostActions: postActionSummary,
      },
    });

    return {
      payment: buildPaymentDetailDto(responsePayment),
      wallet: settled?.wallet || null,
      creditTransactionId: settled?.transaction?._id || responsePayment?.creditTransaction || payment?.creditTransaction || null,
      alreadyProcessed: Boolean(settled?.alreadyProcessed),
      grantedCredits: !Boolean(settled?.alreadyProcessed),
      duplicateDetected: false,
      googleVerification: {
        verificationTimeMs: verification.verificationTimeMs,
        purchaseState: verification.purchaseState,
        orderId: verification.orderId || null,
        regionCode: verification.regionCode || null,
      },
      googlePostActions: postActionSummary,
    };
  } catch (error) {
    await paymentAuditService
      .logEvent({
        action: isRestore ? 'PAYMENT_RESTORE_FAILED' : 'PAYMENT_GOOGLE_VERIFY_FAILED',
        actorUserId: userId,
        targetId: null,
        request,
        metadata: {
          productId: payload.productId || null,
          orderId: payload.orderId || null,
          idempotencyKey: idempotencyKey || null,
          code: error.code || 'PAYMENT_VERIFICATION_FAILED',
          message: error.message,
        },
      })
      .catch(() => null);
    throw error;
  }
};

const normalizeRestorePurchases = (payload = {}) => {
  if (Array.isArray(payload.purchases) && payload.purchases.length > 0) {
    return payload.purchases
      .map((purchase) => ({
        purchaseToken: purchase?.purchaseToken || null,
        productId: purchase?.productId || null,
        orderId: purchase?.orderId || null,
        packageName: purchase?.packageName || payload.packageName || null,
        paymentType: 'credit_purchase',
        productType: 'inapp',
        clientDeviceId: purchase?.clientDeviceId || payload.clientDeviceId || null,
        device: purchase?.device || payload.device || null,
      }))
      .filter((purchase) => purchase.purchaseToken && purchase.productId);
  }

  const tokens = Array.isArray(payload.purchaseTokens) ? payload.purchaseTokens : [];
  const productIds = Array.isArray(payload.productIds) ? payload.productIds : [];
  const orderIds = Array.isArray(payload.orderIds) ? payload.orderIds : [];
  const count = Math.max(tokens.length, productIds.length, orderIds.length);

  const items = [];
  for (let index = 0; index < count; index += 1) {
    if (!tokens[index] || !productIds[index]) {
      continue;
    }
    items.push({
      purchaseToken: tokens[index],
      productId: productIds[index],
      orderId: orderIds[index] || null,
      packageName: payload.packageName || null,
      paymentType: 'credit_purchase',
      productType: 'inapp',
      clientDeviceId: payload.clientDeviceId || null,
      device: payload.device || null,
    });
  }
  return items;
};

const restoreCreditPurchases = async ({
  userId,
  payload = {},
  request = null,
  idempotencyKey = null,
} = {}) => {
  const purchases = normalizeRestorePurchases(payload);
  if (purchases.length === 0) {
    throw new ApiError(400, 'At least one purchase is required for restore.', { code: 'RESTORE_PURCHASES_REQUIRED' });
  }

  const results = [];
  for (let index = 0; index < purchases.length; index += 1) {
    const item = purchases[index];
    const itemIdempotencyKey = idempotencyKey ? `${idempotencyKey}:${index + 1}` : null;
    try {
      const result = await verifyAndSettleCreditPurchase({
        userId,
        payload: item,
        request,
        idempotencyKey: itemIdempotencyKey,
        isRestore: true,
      });
      results.push({
        productId: item.productId,
        orderId: item.orderId || result.payment?.orderId || null,
        paymentId: result.payment?.id || null,
        grantedCredits: Boolean(result.grantedCredits),
        alreadyProcessed: Boolean(result.alreadyProcessed),
        status: 'success',
      });
    } catch (error) {
      results.push({
        productId: item.productId,
        orderId: item.orderId || null,
        paymentId: null,
        grantedCredits: false,
        alreadyProcessed: false,
        status: 'failed',
        error: {
          code: error.code || 'PURCHASE_RESTORE_FAILED',
          message: error.message,
        },
      });
    }
  }

  return {
    items: results,
    summary: {
      requested: purchases.length,
      granted: results.filter((item) => item.grantedCredits).length,
      alreadyProcessed: results.filter((item) => item.alreadyProcessed).length,
      failed: results.filter((item) => item.status === 'failed').length,
    },
  };
};

const purchaseVerificationService = Object.freeze({
  verifyAndSettleCreditPurchase,
  restoreCreditPurchases,
});

export default purchaseVerificationService;
