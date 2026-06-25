const buildResult = ({ valid = true, message = '', errors = [] } = {}) => ({ valid, message, errors });

const validateVerifyGooglePurchase = async (body = {}) => {
  const errors = [];

  if (!body.purchaseToken || typeof body.purchaseToken !== 'string') {
    errors.push({ field: 'purchaseToken', message: 'purchaseToken is required.' });
  }
  if (!body.productId || typeof body.productId !== 'string') {
    errors.push({ field: 'productId', message: 'productId is required.' });
  }
  if (body.packageName !== undefined && body.packageName !== null && typeof body.packageName !== 'string') {
    errors.push({ field: 'packageName', message: 'packageName must be a string.' });
  }
  if (body.orderId !== undefined && body.orderId !== null && typeof body.orderId !== 'string') {
    errors.push({ field: 'orderId', message: 'orderId must be a string.' });
  }
  if (body.paymentType !== undefined && !['credit_purchase', 'subscription'].includes(body.paymentType)) {
    errors.push({ field: 'paymentType', message: 'paymentType must be credit_purchase or subscription.' });
  }
  if (body.paymentType === 'subscription') {
    errors.push({ field: 'paymentType', message: 'subscription verification is not implemented in this phase.' });
  }
  if (body.productType !== undefined && !['inapp', 'subs'].includes(body.productType)) {
    errors.push({ field: 'productType', message: 'productType must be inapp or subs.' });
  }
  if (body.productType === 'subs') {
    errors.push({ field: 'productType', message: 'subs is not implemented in this phase.' });
  }

  return errors.length > 0 ? buildResult({ valid: false, message: 'Validation failed.', errors }) : buildResult({ valid: true });
};

const validateRestorePurchases = async (body = {}) => {
  const errors = [];
  const listFields = ['productIds', 'orderIds', 'purchaseTokens'];

  for (const field of listFields) {
    if (body[field] !== undefined && body[field] !== null && !Array.isArray(body[field])) {
      errors.push({ field, message: `${field} must be an array.` });
      continue;
    }
    if (Array.isArray(body[field])) {
      for (let i = 0; i < body[field].length; i += 1) {
        if (typeof body[field][i] !== 'string') {
          errors.push({ field: `${field}[${i}]`, message: 'Each value must be a string.' });
        }
      }
    }
  }

  if (body.purchases !== undefined && body.purchases !== null) {
    if (!Array.isArray(body.purchases) || body.purchases.length === 0) {
      errors.push({ field: 'purchases', message: 'purchases must be a non-empty array.' });
    } else {
      for (let i = 0; i < body.purchases.length; i += 1) {
        const item = body.purchases[i] || {};
        if (!item.purchaseToken || typeof item.purchaseToken !== 'string') {
          errors.push({ field: `purchases[${i}].purchaseToken`, message: 'purchaseToken is required.' });
        }
        if (!item.productId || typeof item.productId !== 'string') {
          errors.push({ field: `purchases[${i}].productId`, message: 'productId is required.' });
        }
        if (item.orderId !== undefined && item.orderId !== null && typeof item.orderId !== 'string') {
          errors.push({ field: `purchases[${i}].orderId`, message: 'orderId must be a string.' });
        }
        if (item.packageName !== undefined && item.packageName !== null && typeof item.packageName !== 'string') {
          errors.push({ field: `purchases[${i}].packageName`, message: 'packageName must be a string.' });
        }
      }
    }
  }

  const hasLegacyArrays =
    (Array.isArray(body.productIds) && body.productIds.length > 0) ||
    (Array.isArray(body.orderIds) && body.orderIds.length > 0) ||
    (Array.isArray(body.purchaseTokens) && body.purchaseTokens.length > 0);

  if (!Array.isArray(body.purchases) && !hasLegacyArrays) {
    errors.push({ field: 'purchases', message: 'Provide purchases or legacy productIds/purchaseTokens arrays.' });
  }

  return errors.length > 0 ? buildResult({ valid: false, message: 'Validation failed.', errors }) : buildResult({ valid: true });
};

const validatePaymentHistoryQuery = async (query = {}) => {
  const errors = [];
  if (query.page !== undefined) {
    const n = Number(query.page);
    if (!Number.isFinite(n) || n <= 0) {
      errors.push({ field: 'page', message: 'page must be a positive number.' });
    }
  }
  if (query.limit !== undefined) {
    const n = Number(query.limit);
    if (!Number.isFinite(n) || n <= 0 || n > 100) {
      errors.push({ field: 'limit', message: 'limit must be between 1 and 100.' });
    }
  }
  if (query.paymentType !== undefined && !['credit_purchase', 'subscription'].includes(String(query.paymentType).trim().toLowerCase())) {
    errors.push({ field: 'paymentType', message: 'paymentType must be credit_purchase or subscription.' });
  }

  return errors.length > 0 ? buildResult({ valid: false, message: 'Validation failed.', errors }) : buildResult({ valid: true });
};

const validatePaymentDetailParams = async (params = {}) => {
  const errors = [];
  if (!params.id || typeof params.id !== 'string') {
    errors.push({ field: 'id', message: 'Payment id is required.' });
  }
  return errors.length > 0 ? buildResult({ valid: false, message: 'Validation failed.', errors }) : buildResult({ valid: true });
};

const paymentValidator = Object.freeze({
  validateVerifyGooglePurchase,
  validateRestorePurchases,
  validatePaymentHistoryQuery,
  validatePaymentDetailParams,
});

export default paymentValidator;
