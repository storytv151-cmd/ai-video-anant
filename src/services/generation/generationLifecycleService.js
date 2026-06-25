import ApiError from '../../utils/ApiError.js';

const TRANSITIONS = Object.freeze({
  pending: new Set(['queued', 'processing', 'failed', 'cancelled']),
  queued: new Set(['processing', 'failed', 'cancelled', 'timeout']),
  processing: new Set(['completed', 'failed', 'cancelled', 'timeout']),
  completed: new Set([]),
  failed: new Set(['pending']),
  cancelled: new Set(['pending']),
  refunded: new Set([]),
  timeout: new Set(['pending']),
  expired: new Set([]),
});

const assertTransitionAllowed = ({ from, to }) => {
  if (!from || !to) {
    throw new ApiError(400, 'Invalid generation job transition.', { code: 'GENERATION_TRANSITION_INVALID' });
  }
  const allowed = TRANSITIONS[from];
  if (!allowed || !allowed.has(to)) {
    throw new ApiError(409, 'Generation job transition is not allowed.', {
      code: 'GENERATION_TRANSITION_NOT_ALLOWED',
      details: [{ from, to }],
    });
  }
};

const generationLifecycleService = Object.freeze({
  assertTransitionAllowed,
});

export default generationLifecycleService;

