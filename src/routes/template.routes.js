/**
 * Template routes.
 * Public endpoints for listing, searching, and retrieving video templates.
 */
import { Router } from 'express';
import validation from '../middleware/validation.js';
import { REQUEST_SOURCES } from '../utils/constants.js';
import asyncHandler from '../utils/asyncHandler.js';
import templateValidator from '../validators/template.validator.js';
import {
  featured,
  getTemplateBySlug,
  listTemplates,
  recommended,
  search,
  trending,
} from '../controllers/template.controller.js';

const templateRouter = Router();

templateRouter.get('/', validation(templateValidator.validateList, REQUEST_SOURCES.QUERY), asyncHandler(listTemplates));
templateRouter.get(
  '/search',
  validation(templateValidator.validateList, REQUEST_SOURCES.QUERY),
  asyncHandler(search),
);
templateRouter.get('/trending', asyncHandler(trending));
templateRouter.get('/featured', asyncHandler(featured));
templateRouter.get('/recommended', asyncHandler(recommended));
templateRouter.get(
  '/:slug',
  validation(templateValidator.validateSlugParam, REQUEST_SOURCES.PARAMS),
  asyncHandler(getTemplateBySlug),
);

export default templateRouter;
