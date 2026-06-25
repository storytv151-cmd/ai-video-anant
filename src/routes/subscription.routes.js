import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import idempotency from '../middleware/idempotency.js';
import validation from '../middleware/validation.js';
import asyncHandler from '../utils/asyncHandler.js';
import { REQUEST_SOURCES } from '../utils/constants.js';
import {
  getCurrentSubscription,
  getSubscriptionHistory,
  getSubscriptionPlans,
  getVerifiedSubscriptionStatus,
  listSubscriptions,
  restoreGoogleSubscriptions,
  verifyGoogleSubscription,
} from '../controllers/subscription.controller.js';
import subscriptionValidator from '../validators/subscription.validator.js';

const subscriptionRouter = Router();

subscriptionRouter.get('/', validation(subscriptionValidator.validateListPlans), asyncHandler(listSubscriptions));
subscriptionRouter.get('/plans', validation(subscriptionValidator.validateListPlans), asyncHandler(getSubscriptionPlans));
subscriptionRouter.get('/current', authenticate, validation(subscriptionValidator.validateCurrentSubscription), asyncHandler(getCurrentSubscription));
subscriptionRouter.get(
  '/status',
  authenticate,
  validation(subscriptionValidator.validateSubscriptionStatusQuery, REQUEST_SOURCES.QUERY),
  asyncHandler(getVerifiedSubscriptionStatus),
);
subscriptionRouter.get(
  '/history',
  authenticate,
  validation(subscriptionValidator.validateSubscriptionHistory, REQUEST_SOURCES.QUERY),
  asyncHandler(getSubscriptionHistory),
);
subscriptionRouter.post(
  '/google/verify',
  authenticate,
  idempotency(false),
  validation(subscriptionValidator.validateVerifyGoogleSubscription, REQUEST_SOURCES.BODY),
  asyncHandler(verifyGoogleSubscription),
);
subscriptionRouter.post(
  '/google/restore',
  authenticate,
  idempotency(false),
  validation(subscriptionValidator.validateRestoreGoogleSubscriptions, REQUEST_SOURCES.BODY),
  asyncHandler(restoreGoogleSubscriptions),
);

export default subscriptionRouter;
