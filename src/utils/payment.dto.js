const buildPaymentDto = (payment = {}) => ({
  id: payment._id || payment.id || null,
  paymentType: payment.paymentType || null,
  platform: payment.platform || payment.gateway || null,
  productType: payment.productType || null,
  productId: payment.productId || null,
  packageName: payment.packageName || null,
  packageCode: payment.packageCode || null,
  orderId: payment.orderId || null,
  googlePurchaseId: payment.googlePurchaseId || null,
  purchaseState: payment.purchaseState || null,
  verificationStatus: payment.verificationStatus || null,
  status: payment.status || null,
  amount: payment.amount ?? 0,
  currency: payment.currency || null,
  countryCode: payment.countryCode || null,
  creditsPurchased: payment.creditsPurchased ?? 0,
  quantity: payment.quantity ?? 1,
  refundableQuantity: payment.refundableQuantity ?? null,
  isAcknowledged: Boolean(payment.isAcknowledged),
  isConsumed: Boolean(payment.isConsumed),
  purchaseTime: payment.purchaseTime || null,
  verifiedAt: payment.verifiedAt || null,
  acknowledgedAt: payment.acknowledgedAt || null,
  consumedAt: payment.consumedAt || null,
  refundedAt: payment.refundedAt || null,
  restoredAt: payment.restoredAt || null,
  verificationTimeMs: payment.verificationTimeMs ?? null,
  creditTransactionId: payment.creditTransaction || null,
  createdAt: payment.createdAt || null,
  updatedAt: payment.updatedAt || null,
});

const buildPaymentDetailDto = (payment = {}) => ({
  ...buildPaymentDto(payment),
  walletId: payment.wallet || null,
  requestId: payment.requestId || null,
  requestIdempotencyKey: payment.requestIdempotencyKey || null,
  verificationMessage: payment.verificationMessage || null,
  purchaseStateCode: payment.purchaseStateCode ?? null,
  acknowledgementStateCode: payment.acknowledgementStateCode ?? null,
  consumptionStateCode: payment.consumptionStateCode ?? null,
  developerPayload:
    payment.verificationPayload?.googleResponse?.developerPayload ||
    payment.metadata?.developerPayload ||
    null,
  rawVerificationStatus: payment.verificationPayload?.status || null,
  metadata: payment.metadata || {},
});

export { buildPaymentDto, buildPaymentDetailDto };
