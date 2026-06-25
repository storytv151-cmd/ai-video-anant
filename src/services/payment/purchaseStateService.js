const PURCHASE_STATES = Object.freeze([
  'pending',
  'purchased',
  'acknowledged',
  'consumed',
  'cancelled',
  'expired',
  'refunded',
  'revoked',
  'paused',
  'grace_period',
  'on_hold',
]);

const normalizePurchaseState = (value, fallback = 'pending') => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

  if (!normalized) {
    return fallback;
  }

  const aliases = {
    purchase_pending: 'pending',
    purchase_completed: 'purchased',
    graceperiod: 'grace_period',
    grace: 'grace_period',
    hold: 'on_hold',
  };

  const resolved = aliases[normalized] || normalized;
  return PURCHASE_STATES.includes(resolved) ? resolved : fallback;
};

const isTerminalPurchaseState = (value) =>
  ['consumed', 'cancelled', 'expired', 'refunded', 'revoked'].includes(normalizePurchaseState(value));

const canAcknowledgePurchase = (value) => ['purchased'].includes(normalizePurchaseState(value));

const canConsumePurchase = (value) => ['purchased', 'acknowledged'].includes(normalizePurchaseState(value));

const canRestorePurchase = (value) => ['purchased', 'acknowledged', 'grace_period', 'on_hold', 'paused'].includes(normalizePurchaseState(value));

const purchaseStateService = Object.freeze({
  PURCHASE_STATES,
  normalizePurchaseState,
  isTerminalPurchaseState,
  canAcknowledgePurchase,
  canConsumePurchase,
  canRestorePurchase,
});

export default purchaseStateService;
