import ApiError from '../../utils/ApiError.js';
import subscriptionSyncService from './subscriptionSyncService.js';

const normalizeRestorePayload = (payload = {}) => {
  if (Array.isArray(payload.purchases) && payload.purchases.length > 0) {
    return payload.purchases
      .map((purchase) => ({
        purchaseToken: purchase?.purchaseToken || null,
        packageName: purchase?.packageName || payload.packageName || null,
        productId: purchase?.productId || null,
        clientDeviceId: purchase?.clientDeviceId || payload.clientDeviceId || null,
        device: purchase?.device || payload.device || null,
      }))
      .filter((purchase) => purchase.purchaseToken);
  }

  const tokens = Array.isArray(payload.purchaseTokens) ? payload.purchaseTokens : [];
  const productIds = Array.isArray(payload.productIds) ? payload.productIds : [];
  const items = [];

  for (let index = 0; index < tokens.length; index += 1) {
    if (!tokens[index]) {
      continue;
    }
    items.push({
      purchaseToken: tokens[index],
      packageName: payload.packageName || null,
      productId: productIds[index] || null,
      clientDeviceId: payload.clientDeviceId || null,
      device: payload.device || null,
    });
  }

  return items;
};

const restoreSubscriptions = async ({
  userId,
  payload = {},
  request = null,
  idempotencyKey = null,
} = {}) => {
  const items = normalizeRestorePayload(payload);
  if (items.length === 0) {
    throw new ApiError(400, 'At least one subscription purchase is required for restore.', {
      code: 'SUBSCRIPTION_RESTORE_INPUT_REQUIRED',
    });
  }

  const results = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    try {
      const result = await subscriptionSyncService.verifySubscriptionForUser({
        userId,
        payload: item,
        request,
        idempotencyKey: idempotencyKey ? `${idempotencyKey}:${index + 1}` : null,
        syncReason: 'restore',
      });
      results.push({
        productId: result.google?.productId || item.productId || null,
        paymentId: result.paymentId || null,
        status: 'success',
        subscription: result.subscription,
      });
    } catch (error) {
      results.push({
        productId: item.productId || null,
        paymentId: null,
        status: 'failed',
        error: {
          code: error.code || 'SUBSCRIPTION_RESTORE_FAILED',
          message: error.message,
        },
      });
    }
  }

  return {
    items: results,
    summary: {
      requested: items.length,
      restored: results.filter((item) => item.status === 'success').length,
      failed: results.filter((item) => item.status === 'failed').length,
    },
  };
};

const subscriptionRestoreService = Object.freeze({
  restoreSubscriptions,
});

export default subscriptionRestoreService;
