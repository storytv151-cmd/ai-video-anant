import TemplateCategoryModel from '../../models/TemplateCategory.js';
import VideoTemplateModel from '../../models/VideoTemplate.js';
import ApiError from '../../utils/ApiError.js';
import adminAuditService from './adminAuditService.js';
import adminQueryService from './adminQueryService.js';

const CATEGORY_FIELDS = Object.freeze([
  'title',
  'slug',
  'description',
  'icon',
  'banner',
  'sortOrder',
  'featured',
  'status',
]);

const TEMPLATE_FIELDS = Object.freeze([
  'category',
  'title',
  'slug',
  'description',
  'previewImage',
  'previewImages',
  'previewVideo',
  'previewVideos',
  'thumbnail',
  'prompt',
  'negativePrompt',
  'supportedProviders',
  'supportedProviderModels',
  'requiredImages',
  'inputType',
  'generationType',
  'minimumImages',
  'maximumImages',
  'allowPrompt',
  'allowNegativePrompt',
  'allowReferenceImage',
  'allowMaskImage',
  'allowInputVideo',
  'allowInputAudio',
  'allowMultipleOutputs',
  'defaultAspectRatio',
  'supportedOutputTypes',
  'aspectRatio',
  'duration',
  'tags',
  'trending',
  'featured',
  'premium',
  'creditsOverride',
  'estimatedGenerationTimeMs',
  'usageCount',
  'favoriteCount',
  'publishAt',
  'expiresAt',
  'sortOrder',
  'status',
  'metadata',
]);

const pickAllowedFields = ({ payload = {}, fields = [] } = {}) =>
  fields.reduce((accumulator, field) => {
    if (payload[field] !== undefined) {
      accumulator[field] = payload[field];
    }
    return accumulator;
  }, {});

const normalizeSlug = (value) => String(value || '').trim().toLowerCase();

const listTemplates = async ({ query = {} } = {}) => {
  const { page, limit, skip } = adminQueryService.buildPagination({
    page: query.page,
    limit: query.limit,
    maxLimit: 100,
  });
  const filter = {};
  if (query.status) {
    filter.status = String(query.status).trim().toLowerCase();
  }
  if (query.category) {
    filter.category = query.category;
  }
  if (adminQueryService.parseBoolean(query.premium, null) !== null) {
    filter.premium = adminQueryService.parseBoolean(query.premium, false);
  }
  if (adminQueryService.parseBoolean(query.featured, null) !== null) {
    filter.featured = adminQueryService.parseBoolean(query.featured, false);
  }
  if (adminQueryService.parseBoolean(query.trending, null) !== null) {
    filter.trending = adminQueryService.parseBoolean(query.trending, false);
  }
  if (adminQueryService.parseBoolean(query.deletedOnly, false)) {
    filter.isDeleted = true;
  }
  const searchRegex = adminQueryService.buildRegexSearch(query.search);
  if (searchRegex) {
    filter.$or = [{ title: searchRegex }, { slug: searchRegex }, { description: searchRegex }];
  }

  let itemsQuery = VideoTemplateModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
  let countQuery = VideoTemplateModel.countDocuments(filter);
  if (adminQueryService.parseBoolean(query.includeDeleted, false) || filter.isDeleted === true) {
    itemsQuery = itemsQuery.withDeleted();
    countQuery = VideoTemplateModel.countDocuments(filter).setOptions({ withDeleted: true });
  }

  const [items, total] = await Promise.all([
    itemsQuery.populate({ path: 'category', model: 'TemplateCategory', select: { title: 1, slug: 1 } }).lean(),
    countQuery,
  ]);
  return adminQueryService.buildPaginatedResponse({ items, page, limit, total });
};

const getTemplate = async ({ templateId, withDeleted = true } = {}) => {
  let query = VideoTemplateModel.findById(templateId).populate({
    path: 'category',
    model: 'TemplateCategory',
    select: { title: 1, slug: 1 },
  });
  if (withDeleted) {
    query = query.withDeleted();
  }
  const template = await query.lean();
  if (!template) {
    throw new ApiError(404, 'Template not found.', { code: 'TEMPLATE_NOT_FOUND' });
  }
  return template;
};

const createTemplate = async ({ payload = {}, adminUserId = null, request = null } = {}) => {
  const template = await VideoTemplateModel.create(pickAllowedFields({ payload, fields: TEMPLATE_FIELDS }));

  await adminAuditService.logAdminAction({
    request,
    adminUserId,
    action: 'ADMIN_TEMPLATE_CREATED',
    targetType: 'VideoTemplate',
    targetId: template._id,
    metadata: { slug: template.slug, status: template.status },
  });

  return getTemplate({ templateId: template._id, withDeleted: true });
};

const updateTemplate = async ({ templateId, payload = {}, adminUserId = null, request = null } = {}) => {
  const template = await VideoTemplateModel.findById(templateId).withDeleted();
  if (!template) {
    throw new ApiError(404, 'Template not found.', { code: 'TEMPLATE_NOT_FOUND' });
  }
  Object.assign(template, pickAllowedFields({ payload, fields: TEMPLATE_FIELDS }));
  await template.save();

  await adminAuditService.logAdminAction({
    request,
    adminUserId,
    action: 'ADMIN_TEMPLATE_UPDATED',
    targetType: 'VideoTemplate',
    targetId: template._id,
    metadata: { slug: template.slug, status: template.status },
  });

  return getTemplate({ templateId: template._id, withDeleted: true });
};

const deleteTemplate = async ({ templateId, adminUserId = null, request = null } = {}) => {
  const template = await VideoTemplateModel.findById(templateId).withDeleted();
  if (!template) {
    throw new ApiError(404, 'Template not found.', { code: 'TEMPLATE_NOT_FOUND' });
  }
  await template.softDelete();

  await adminAuditService.logAdminAction({
    request,
    adminUserId,
    action: 'ADMIN_TEMPLATE_DELETED',
    targetType: 'VideoTemplate',
    targetId: template._id,
    metadata: { slug: template.slug },
  });

  return { deleted: true, id: template._id };
};

const listCategories = async ({ query = {} } = {}) => {
  const { page, limit, skip } = adminQueryService.buildPagination({
    page: query.page,
    limit: query.limit,
    maxLimit: 100,
  });
  const filter = {};
  if (query.status) {
    filter.status = String(query.status).trim().toLowerCase();
  }
  const searchRegex = adminQueryService.buildRegexSearch(query.search);
  if (searchRegex) {
    filter.$or = [{ title: searchRegex }, { slug: searchRegex }, { description: searchRegex }];
  }

  let itemsQuery = TemplateCategoryModel.find(filter).sort({ sortOrder: 1, createdAt: -1 }).skip(skip).limit(limit);
  let countQuery = TemplateCategoryModel.countDocuments(filter);
  if (adminQueryService.parseBoolean(query.includeDeleted, false)) {
    itemsQuery = itemsQuery.withDeleted();
    countQuery = TemplateCategoryModel.countDocuments(filter).setOptions({ withDeleted: true });
  }

  const [items, total] = await Promise.all([itemsQuery.lean(), countQuery]);
  return adminQueryService.buildPaginatedResponse({ items, page, limit, total });
};

const getCategory = async ({ categoryId, withDeleted = true } = {}) => {
  let query = TemplateCategoryModel.findById(categoryId);
  if (withDeleted) {
    query = query.withDeleted();
  }
  const category = await query.lean();
  if (!category) {
    throw new ApiError(404, 'Category not found.', { code: 'CATEGORY_NOT_FOUND' });
  }
  return category;
};

const createCategory = async ({ payload = {}, adminUserId = null, request = null } = {}) => {
  const category = await TemplateCategoryModel.create({
    ...pickAllowedFields({ payload, fields: CATEGORY_FIELDS }),
    slug: normalizeSlug(payload.slug || payload.title),
  });

  await adminAuditService.logAdminAction({
    request,
    adminUserId,
    action: 'ADMIN_CATEGORY_CREATED',
    targetType: 'TemplateCategory',
    targetId: category._id,
    metadata: { slug: category.slug, status: category.status },
  });

  return getCategory({ categoryId: category._id, withDeleted: true });
};

const updateCategory = async ({ categoryId, payload = {}, adminUserId = null, request = null } = {}) => {
  const category = await TemplateCategoryModel.findById(categoryId).withDeleted();
  if (!category) {
    throw new ApiError(404, 'Category not found.', { code: 'CATEGORY_NOT_FOUND' });
  }
  Object.assign(category, pickAllowedFields({ payload, fields: CATEGORY_FIELDS }));
  if (payload.slug || payload.title) {
    category.slug = normalizeSlug(payload.slug || category.slug || payload.title);
  }
  await category.save();

  await adminAuditService.logAdminAction({
    request,
    adminUserId,
    action: 'ADMIN_CATEGORY_UPDATED',
    targetType: 'TemplateCategory',
    targetId: category._id,
    metadata: { slug: category.slug, status: category.status },
  });

  return getCategory({ categoryId: category._id, withDeleted: true });
};

const deleteCategory = async ({ categoryId, adminUserId = null, request = null } = {}) => {
  const category = await TemplateCategoryModel.findById(categoryId).withDeleted();
  if (!category) {
    throw new ApiError(404, 'Category not found.', { code: 'CATEGORY_NOT_FOUND' });
  }
  await category.softDelete();

  await adminAuditService.logAdminAction({
    request,
    adminUserId,
    action: 'ADMIN_CATEGORY_DELETED',
    targetType: 'TemplateCategory',
    targetId: category._id,
    metadata: { slug: category.slug },
  });

  return { deleted: true, id: category._id };
};

const adminTemplateService = Object.freeze({
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
});

export default adminTemplateService;
