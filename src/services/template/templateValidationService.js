/**
 * Template validation service.
 * Validates template query inputs and resolves filter references (category/provider/provider model).
 */
import ApiError from '../../utils/ApiError.js';
import ProviderModel from '../../models/Provider.js';
import ProviderModelModel from '../../models/ProviderModel.js';
import TemplateCategoryModel from '../../models/TemplateCategory.js';

const allowedStatuses = Object.freeze(['draft', 'active', 'inactive', 'archived']);
const allowedSorts = Object.freeze([
  'newest',
  'oldest',
  'trending',
  'most_used',
  'featured',
  'alphabetical',
  'credits',
  'credits_low',
  'credits_high',
]);

const parseBoolean = (value) => {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'true') {
    return true;
  }
  if (normalized === 'false') {
    return false;
  }
  return null;
};

const parseNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const resolveCategoryBySlug = async (slug) => {
  if (!slug) {
    return null;
  }
  const category = await TemplateCategoryModel.findOne({ slug: String(slug).toLowerCase(), status: 'active' }).lean();
  if (!category) {
    throw new ApiError(404, 'Category not found.', { code: 'CATEGORY_NOT_FOUND' });
  }
  return category;
};

const resolveProviderBySlug = async (slug) => {
  if (!slug) {
    return null;
  }
  const provider = await ProviderModel.findOne({ slug: String(slug).toLowerCase(), enabled: true }).lean();
  if (!provider) {
    throw new ApiError(404, 'Provider not found.', { code: 'PROVIDER_NOT_FOUND' });
  }
  return provider;
};

const resolveProviderModelBySlug = async (slug) => {
  if (!slug) {
    return null;
  }
  const model = await ProviderModelModel.findOne({ slug: String(slug).toLowerCase(), enabled: true }).lean();
  if (!model) {
    throw new ApiError(404, 'Provider model not found.', { code: 'PROVIDER_MODEL_NOT_FOUND' });
  }
  return model;
};

const validateListQuery = (query) => {
  const page = parseNumber(query.page) || 1;
  const limit = parseNumber(query.limit) || 20;

  if (!Number.isFinite(page) || page <= 0) {
    throw new ApiError(400, 'Invalid page.', { code: 'INVALID_PAGE' });
  }

  if (!Number.isFinite(limit) || limit <= 0 || limit > 100) {
    throw new ApiError(400, 'Invalid limit.', { code: 'INVALID_LIMIT' });
  }

  const sort = query.sort ? String(query.sort).toLowerCase() : 'newest';
  if (sort && !allowedSorts.includes(sort)) {
    throw new ApiError(400, 'Invalid sort option.', { code: 'INVALID_SORT' });
  }

  const status = query.status ? String(query.status).toLowerCase() : null;
  if (status && !allowedStatuses.includes(status)) {
    throw new ApiError(400, 'Invalid status filter.', { code: 'INVALID_STATUS' });
  }
  if (status && status !== 'active') {
    throw new ApiError(400, 'Only active templates are available in public APIs.', {
      code: 'PUBLIC_STATUS_RESTRICTED',
    });
  }

  const requiredImages = parseNumber(query.requiredImages);
  if (requiredImages !== null && (!Number.isFinite(requiredImages) || requiredImages < 0 || requiredImages > 20)) {
    throw new ApiError(400, 'Invalid requiredImages filter.', { code: 'INVALID_REQUIRED_IMAGES' });
  }

  const minCredits = parseNumber(query.minCredits);
  const maxCredits = parseNumber(query.maxCredits);
  if (minCredits !== null && minCredits < 0) {
    throw new ApiError(400, 'Invalid minCredits filter.', { code: 'INVALID_MIN_CREDITS' });
  }
  if (maxCredits !== null && maxCredits < 0) {
    throw new ApiError(400, 'Invalid maxCredits filter.', { code: 'INVALID_MAX_CREDITS' });
  }
  if (minCredits !== null && maxCredits !== null && minCredits > maxCredits) {
    throw new ApiError(400, 'minCredits cannot be greater than maxCredits.', { code: 'INVALID_CREDITS_RANGE' });
  }

  return {
    page: Math.floor(page),
    limit: Math.floor(limit),
    sort,
    status,
    premium: parseBoolean(query.premium),
    trending: parseBoolean(query.trending),
    featured: parseBoolean(query.featured),
    aspectRatio: query.aspectRatio ? String(query.aspectRatio).trim() : null,
    requiredImages,
    minCredits,
    maxCredits,
    categorySlug: query.category ? String(query.category).toLowerCase() : null,
    providerSlug: query.provider ? String(query.provider).toLowerCase() : null,
    providerModelSlug: query.providerModel ? String(query.providerModel).toLowerCase() : null,
    keyword: query.q ? String(query.q).trim() : null,
    tagsRaw: query.tags ?? query.tag ?? null,
  };
};

const templateValidationService = Object.freeze({
  validateListQuery,
  resolveCategoryBySlug,
  resolveProviderBySlug,
  resolveProviderModelBySlug,
});

export default templateValidationService;
