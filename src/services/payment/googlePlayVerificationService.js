import { GoogleAuth } from 'google-auth-library';
import environment from '../../config/environment.js';
import { applicationLogger } from '../../config/logger.js';
import ApiError from '../../utils/ApiError.js';
import purchaseStateService from './purchaseStateService.js';

const GOOGLE_PLAY_SCOPE = 'https://www.googleapis.com/auth/androidpublisher';
const GOOGLE_PLAY_BASE_URL = 'https://androidpublisher.googleapis.com/androidpublisher/v3';

let authClientPromise = null;

const parseServiceAccountJson = () => {
  const raw = String(environment.integrations.googlePlay.serviceAccountJson || '').trim();
  if (!raw) {
    throw new ApiError(500, 'GOOGLE_SERVICE_ACCOUNT_JSON is not configured.', { code: 'GOOGLE_PLAY_CREDENTIALS_MISSING' });
  }

  const candidates = [raw];
  try {
    candidates.push(Buffer.from(raw, 'base64').toString('utf8'));
  } catch {
    // Ignore invalid base64 input and continue using the raw string.
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed?.client_email && parsed?.private_key) {
        return parsed;
      }
    } catch {
      // Try the next candidate.
    }
  }

  throw new ApiError(500, 'GOOGLE_SERVICE_ACCOUNT_JSON is invalid.', { code: 'GOOGLE_PLAY_CREDENTIALS_INVALID' });
};

const getAuthClient = async () => {
  if (!authClientPromise) {
    authClientPromise = (async () => {
      const credentials = parseServiceAccountJson();
      const auth = new GoogleAuth({
        credentials,
        scopes: [GOOGLE_PLAY_SCOPE],
      });
      return auth.getClient();
    })();
  }
  return authClientPromise;
};

const getAccessToken = async () => {
  const client = await getAuthClient();
  const tokenResult = await client.getAccessToken();
  const token = typeof tokenResult === 'string' ? tokenResult : tokenResult?.token || null;
  if (!token) {
    throw new ApiError(500, 'Unable to obtain Google Play access token.', { code: 'GOOGLE_PLAY_TOKEN_UNAVAILABLE' });
  }
  return token;
};

const parseResponse = async (response) => {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
};

const buildApiError = ({ status, data, packageName, productId }) => {
  const apiMessage = data?.error?.message || data?.raw || 'Google Play API request failed.';
  if (status === 400) {
    return new ApiError(400, apiMessage, {
      code: 'GOOGLE_PLAY_INVALID_REQUEST',
      details: { packageName, productId, googleError: data?.error || data || null },
    });
  }
  if (status === 401 || status === 403) {
    return new ApiError(502, 'Google Play authentication failed.', {
      code: 'GOOGLE_PLAY_AUTH_FAILED',
      details: { packageName, productId, googleError: data?.error || data || null },
    });
  }
  if (status === 404) {
    return new ApiError(404, 'Google Play purchase was not found.', {
      code: 'GOOGLE_PLAY_PURCHASE_NOT_FOUND',
      details: { packageName, productId, googleError: data?.error || data || null },
    });
  }
  return new ApiError(502, apiMessage, {
    code: 'GOOGLE_PLAY_API_ERROR',
    details: { packageName, productId, googleError: data?.error || data || null },
  });
};

const authorizedRequest = async ({ method = 'GET', path, body = null, packageName = null, productId = null }) => {
  const accessToken = await getAccessToken();
  const response = await fetch(`${GOOGLE_PLAY_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await parseResponse(response);

  if (!response.ok) {
    throw buildApiError({ status: response.status, data, packageName, productId });
  }

  return data || {};
};

const safeDateFromMillis = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return new Date(parsed);
};

const derivePurchaseState = ({ purchaseStateCode, acknowledgementStateCode, consumptionStateCode }) => {
  if (purchaseStateCode === 1) {
    return 'cancelled';
  }
  if (purchaseStateCode === 2) {
    return 'pending';
  }
  if (consumptionStateCode === 1) {
    return 'consumed';
  }
  if (acknowledgementStateCode === 1) {
    return 'acknowledged';
  }
  return 'purchased';
};

const normalizeProductPurchaseResponse = ({
  packageName,
  productId,
  purchaseToken,
  response,
  verificationTimeMs,
}) => {
  const purchaseStateCode = Number.isFinite(Number(response?.purchaseState)) ? Number(response.purchaseState) : null;
  const acknowledgementStateCode = Number.isFinite(Number(response?.acknowledgementState))
    ? Number(response.acknowledgementState)
    : null;
  const consumptionStateCode = Number.isFinite(Number(response?.consumptionState)) ? Number(response.consumptionState) : null;
  const quantity = Number.isFinite(Number(response?.quantity)) && Number(response.quantity) > 0 ? Number(response.quantity) : 1;
  const refundableQuantity = Number.isFinite(Number(response?.refundableQuantity)) ? Number(response.refundableQuantity) : null;
  const derivedState = derivePurchaseState({ purchaseStateCode, acknowledgementStateCode, consumptionStateCode });

  return {
    provider: 'google_play',
    verified: true,
    verificationStatus: 'verified',
    packageName,
    productId: response?.productId || productId,
    purchaseToken: response?.purchaseToken || purchaseToken,
    orderId: response?.orderId || null,
    googlePurchaseId: response?.orderId || null,
    purchaseState: purchaseStateService.normalizePurchaseState(derivedState),
    purchaseStateCode,
    acknowledgementStateCode,
    consumptionStateCode,
    isAcknowledged: acknowledgementStateCode === 1,
    isConsumed: consumptionStateCode === 1,
    purchaseTime: safeDateFromMillis(response?.purchaseTimeMillis),
    developerPayload: response?.developerPayload || null,
    regionCode: response?.regionCode || null,
    quantity,
    refundableQuantity,
    purchaseType: Number.isFinite(Number(response?.purchaseType)) ? Number(response.purchaseType) : null,
    obfuscatedExternalAccountId: response?.obfuscatedExternalAccountId || null,
    obfuscatedExternalProfileId: response?.obfuscatedExternalProfileId || null,
    rawResponse: response,
    verificationTimeMs,
  };
};

const verifyInAppPurchase = async ({ packageName, productId, purchaseToken } = {}) => {
  if (!packageName || !productId || !purchaseToken) {
    throw new ApiError(400, 'packageName, productId, and purchaseToken are required.', { code: 'GOOGLE_PLAY_VERIFY_INPUT_REQUIRED' });
  }

  const startedAt = Date.now();
  const response = await authorizedRequest({
    method: 'GET',
    path: `/applications/${encodeURIComponent(packageName)}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`,
    packageName,
    productId,
  });
  const verificationTimeMs = Date.now() - startedAt;

  return normalizeProductPurchaseResponse({
    packageName,
    productId,
    purchaseToken,
    response,
    verificationTimeMs,
  });
};

const acknowledgeInAppPurchase = async ({ packageName, productId, purchaseToken, developerPayload = null } = {}) => {
  await authorizedRequest({
    method: 'POST',
    path: `/applications/${encodeURIComponent(packageName)}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`,
    body: developerPayload ? { developerPayload } : {},
    packageName,
    productId,
  });

  applicationLogger.info('Google Play purchase acknowledged.', {
    provider: 'google_play',
    packageName,
    productId,
  });

  return { acknowledged: true };
};

const consumeInAppPurchase = async ({ packageName, productId, purchaseToken } = {}) => {
  await authorizedRequest({
    method: 'POST',
    path: `/applications/${encodeURIComponent(packageName)}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:consume`,
    body: {},
    packageName,
    productId,
  });

  applicationLogger.info('Google Play purchase consumed.', {
    provider: 'google_play',
    packageName,
    productId,
  });

  return { consumed: true };
};

const googlePlayVerificationService = Object.freeze({
  verifyInAppPurchase,
  acknowledgeInAppPurchase,
  consumeInAppPurchase,
  getAccessToken,
  authorizedRequest,
  safeDateFromMillis,
});

export default googlePlayVerificationService;

export { getAccessToken, authorizedRequest, safeDateFromMillis };
