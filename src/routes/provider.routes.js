import { Router } from 'express';
import validation from '../middleware/validation.js';
import { REQUEST_SOURCES } from '../utils/constants.js';
import asyncHandler from '../utils/asyncHandler.js';
import providerValidator from '../validators/provider.validator.js';
import { getProviderBySlug, healthSummary, listProviders, pricingSummary } from '../controllers/provider.controller.js';

const providerRouter = Router();

providerRouter.get('/', validation(providerValidator.validateList, REQUEST_SOURCES.QUERY), asyncHandler(listProviders));
providerRouter.get('/health', asyncHandler(healthSummary));
providerRouter.get('/pricing', asyncHandler(pricingSummary));
providerRouter.get(
  '/:slug',
  validation(providerValidator.validateSlugParam, REQUEST_SOURCES.PARAMS),
  asyncHandler(getProviderBySlug),
);

export default providerRouter;
