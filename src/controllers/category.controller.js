/**
 * Category controller.
 * Thin controller that delegates category logic to services.
 */
import ApiError from '../utils/ApiError.js';
import { formatSuccessResponse } from '../utils/responseFormatter.js';
import categoryService from '../services/template/categoryService.js';

const listCategories = async (request, response) => {
  const data = await categoryService.listCategories();
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const getCategoryBySlug = async (request, response) => {
  const data = await categoryService.getCategoryBySlug(request.params.slug);
  if (!data) {
    throw new ApiError(404, 'Category not found.', { code: 'CATEGORY_NOT_FOUND' });
  }
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

export { listCategories, getCategoryBySlug };

