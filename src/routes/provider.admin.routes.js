import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import ROLES from '../constants/roles.js';
import validation from '../middleware/validation.js';
import { REQUEST_SOURCES } from '../utils/constants.js';
import asyncHandler from '../utils/asyncHandler.js';
import providerValidator from '../validators/provider.validator.js';
import { getProviderAdmin, healthAdmin, listProvidersAdmin, pricingAdmin } from '../controllers/providerAdmin.controller.js';

const providerAdminRouter = Router();

providerAdminRouter.use(authenticate, authorize(ROLES.ADMIN));

providerAdminRouter.get('/', asyncHandler(listProvidersAdmin));
providerAdminRouter.get('/health', asyncHandler(healthAdmin));
providerAdminRouter.get('/pricing', asyncHandler(pricingAdmin));
providerAdminRouter.get(
  '/:slug',
  validation(providerValidator.validateSlugParam, REQUEST_SOURCES.PARAMS),
  asyncHandler(getProviderAdmin),
);

export default providerAdminRouter;
