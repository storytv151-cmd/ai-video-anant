/**
 * Category routes.
 * Public endpoints for browsing template categories.
 */
import { Router } from 'express';
import validation from '../middleware/validation.js';
import { REQUEST_SOURCES } from '../utils/constants.js';
import asyncHandler from '../utils/asyncHandler.js';
import categoryValidator from '../validators/category.validator.js';
import { getCategoryBySlug, listCategories } from '../controllers/category.controller.js';

const categoryRouter = Router();

categoryRouter.get('/', validation(categoryValidator.validateList), asyncHandler(listCategories));
categoryRouter.get(
  '/:slug',
  validation(categoryValidator.validateSlugParam, REQUEST_SOURCES.PARAMS),
  asyncHandler(getCategoryBySlug),
);

export default categoryRouter;

