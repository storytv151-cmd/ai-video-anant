import ApiError from '../../utils/ApiError.js';
import membershipService from './membershipService.js';

const ACTIVE_STATUSES = Object.freeze(['active', 'trial', 'grace_period', 'renewed']);
const TRANSITION_TYPES = Object.freeze([
  'upgrade',
  'downgrade',
  'renew',
  'expire',
  'pause',
  'resume',
  'cancel',
  'trial',
  'gift',
]);

const assertPlanExists = (plan, code = null) => {
  if (!plan) {
    throw new ApiError(404, 'Subscription plan not found.', {
      code: 'SUBSCRIPTION_PLAN_NOT_FOUND',
      details: { plan: code || null },
    });
  }
};

const assertFeatureName = ({ featureName, featureCatalog = [] } = {}) => {
  const normalized = String(featureName || '').trim();
  if (!normalized) {
    throw new ApiError(400, 'featureName is required.', { code: 'FEATURE_NAME_REQUIRED' });
  }
  if (featureCatalog.length > 0 && !featureCatalog.includes(normalized)) {
    throw new ApiError(404, 'Feature is not defined for membership access.', {
      code: 'FEATURE_NOT_FOUND',
      details: { featureName: normalized },
    });
  }
  return normalized;
};

const assertValidStatus = (status, supportedStatuses = []) => {
  const normalized = membershipService.normalizeStatus(status);
  if (supportedStatuses.length > 0 && !supportedStatuses.includes(normalized)) {
    throw new ApiError(400, 'Subscription status is not supported.', {
      code: 'SUBSCRIPTION_STATUS_INVALID',
      details: { status: normalized },
    });
  }
  return normalized;
};

const assertSubscriptionNotExpired = (subscription = {}) => {
  if (!subscription?.expiresAt) {
    return;
  }
  const expiresAt = new Date(subscription.expiresAt);
  if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() < Date.now()) {
    throw new ApiError(409, 'Subscription has expired.', { code: 'SUBSCRIPTION_EXPIRED' });
  }
};

const isActiveStatus = (status) => ACTIVE_STATUSES.includes(membershipService.normalizeStatus(status));

const assertTransitionSupported = ({ transitionType, currentPlan, targetPlan = null } = {}) => {
  const normalized = String(transitionType || '').trim().toLowerCase();
  if (!TRANSITION_TYPES.includes(normalized)) {
    throw new ApiError(400, 'Unsupported subscription transition.', {
      code: 'SUBSCRIPTION_TRANSITION_INVALID',
      details: { transitionType: normalized },
    });
  }

  const transitions = currentPlan?.transitions || {};
  const map = {
    upgrade: transitions.allowUpgrade,
    downgrade: transitions.allowDowngrade,
    renew: transitions.allowRenew,
    pause: transitions.allowPause,
    resume: transitions.allowResume,
    cancel: transitions.allowCancel,
    trial: transitions.allowTrial,
  };

  if (Object.prototype.hasOwnProperty.call(map, normalized) && map[normalized] === false) {
    throw new ApiError(409, 'Subscription transition is not allowed for this plan.', {
      code: 'SUBSCRIPTION_TRANSITION_NOT_ALLOWED',
      details: {
        transitionType: normalized,
        currentPlan: currentPlan?.code || null,
        targetPlan: targetPlan?.code || null,
      },
    });
  }
};

const subscriptionValidationService = Object.freeze({
  ACTIVE_STATUSES,
  TRANSITION_TYPES,
  assertPlanExists,
  assertFeatureName,
  assertValidStatus,
  assertSubscriptionNotExpired,
  assertTransitionSupported,
  isActiveStatus,
});

export default subscriptionValidationService;
