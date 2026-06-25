import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import validation from '../middleware/validation.js';
import asyncHandler from '../utils/asyncHandler.js';
import { listSubscriptions, getCurrentSubscription } from '../controllers/subscription.controller.js';
import subscriptionValidator from '../validators/subscription.validator.js';

const subscriptionRouter = Router();

subscriptionRouter.get('/', validation(subscriptionValidator.validateListPlans), asyncHandler(listSubscriptions));
subscriptionRouter.get('/current', authenticate, validation(subscriptionValidator.validateCurrentSubscription), asyncHandler(getCurrentSubscription));

export default subscriptionRouter;
