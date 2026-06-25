/**
 * Template service.
 * Implements public template browsing endpoints with pagination, filtering, and optimized projections.
 */
import ApiError from '../../utils/ApiError.js';
import TemplateCategoryModel from '../../models/TemplateCategory.js';
import ProviderModel from '../../models/Provider.js';
import ProviderModelModel from '../../models/ProviderModel.js';
import ProviderPricingModel from '../../models/ProviderPricing.js';
import VideoTemplateModel from '../../models/VideoTemplate.js';
import { buildPaginationMeta } from '../../utils/pagination.js';
import templateProviderService from './templateProviderService.js';
import templateRecommendationService from './templateRecommendationService.js';
import templateSearchService from './templateSearchService.js';
import templateValidationService from './templateValidationService.js';

const buildAvailabilityWindow = () => {
  const now = new Date();
  return {
    $and: [
      { $or: [{ publishAt: null }, { publishAt: { $lte: now } }] },
      { $or: [{ expiresAt: null }, { expiresAt: { $gte: now } }] },
    ],
  };
};

const TEMPLATE_LIST_PROJECTION = Object.freeze({
  _id: 1,
  title: 1,
  slug: 1,
  description: 1,
  thumbnail: 1,
  previewImage: 1,
  previewVideo: 1,
  category: 1,
  tags: 1,
  premium: 1,
  featured: 1,
  trending: 1,
  creditsOverride: 1,
  requiredImages: 1,
  supportedProviders: 1,
  supportedProviderModels: 1,
  aspectRatio: 1,
  duration: 1,
  estimatedGenerationTimeMs: 1,
  usageCount: 1,
  favoriteCount: 1,
  createdAt: 1,
});

const buildCategoryMap = async (categoryIds) => {
  if (categoryIds.length === 0) {
    return new Map();
  }
  const categories = await TemplateCategoryModel.find({ _id: { $in: categoryIds }, status: 'active' })
    .select({ title: 1, slug: 1, description: 1, icon: 1, banner: 1 })
    .lean();
  const map = new Map();
  for (const c of categories) {
    map.set(String(c._id), {
      id: c._id,
      title: c.title,
      slug: c.slug,
      description: c.description,
      icon: c.icon,
      banner: c.banner,
    });
  }
  return map;
};

const buildProviderMap = async (providerIds) => {
  if (providerIds.length === 0) {
    return new Map();
  }
  const providers = await ProviderModel.find({ _id: { $in: providerIds }, enabled: true })
    .select({ name: 1, slug: 1, enabled: 1 })
    .lean();
  const map = new Map();
  for (const p of providers) {
    map.set(String(p._id), { id: p._id, name: p.name, slug: p.slug, enabled: p.enabled });
  }
  return map;
};

const buildProviderModelMap = async (providerModelIds) => {
  if (providerModelIds.length === 0) {
    return new Map();
  }
  const models = await ProviderModelModel.find({ _id: { $in: providerModelIds }, enabled: true })
    .select({ name: 1, slug: 1, enabled: 1, provider: 1 })
    .lean();
  const map = new Map();
  for (const m of models) {
    map.set(String(m._id), { id: m._id, name: m.name, slug: m.slug, enabled: m.enabled, provider: m.provider });
  }
  return map;
};

const applyCreditsToListItems = async (templates) => {
  const needsCredits = templates.filter((t) => t.creditsRequired === undefined);
  if (needsCredits.length === 0) {
    return templates;
  }

  const pricingDocs = await templateProviderService.fetchPricingForTemplates({ templates: needsCredits });
  const pricingMap = templateProviderService.buildMinCreditsMap(pricingDocs);

  return templates.map((t) => {
    if (t.creditsRequired !== undefined) {
      return t;
    }
    return {
      ...t,
      creditsRequired: templateProviderService.resolveCreditsRequired({ template: t, pricingMap }),
    };
  });
};

const normalizeTemplateListItem = ({ template, categoryMap, providerMap, providerModelMap }) => {
  const categoryId =
    template.category && typeof template.category === 'object'
      ? String(template.category._id || template.category.id)
      : template.category
        ? String(template.category)
        : null;

  const supportedProviders = (template.supportedProviders || []).map((p) => {
    const id = p && typeof p === 'object' ? p._id || p.id : p;
    const mapped = id ? providerMap.get(String(id)) : null;
    return mapped || (id ? { id } : null);
  }).filter(Boolean);

  const supportedProviderModels = (template.supportedProviderModels || []).map((m) => {
    const id = m && typeof m === 'object' ? m._id || m.id : m;
    const mapped = id ? providerModelMap.get(String(id)) : null;
    return mapped || (id ? { id } : null);
  }).filter(Boolean);

  return {
    id: template._id || template.id,
    title: template.title,
    slug: template.slug,
    description: template.description,
    thumbnail: template.thumbnail,
    previewImage: template.previewImage,
    previewVideo: template.previewVideo,
    category: categoryId ? categoryMap.get(categoryId) || { id: categoryId } : null,
    tags: template.tags || [],
    premium: Boolean(template.premium),
    featured: Boolean(template.featured),
    trending: Boolean(template.trending),
    creditsRequired: template.creditsRequired ?? null,
    requiredImages: template.requiredImages ?? 0,
    supportedProviders,
    supportedProviderModels,
    aspectRatio: template.aspectRatio,
    duration: template.duration,
    estimatedGenerationTimeMs: template.estimatedGenerationTimeMs ?? null,
    usageCount: template.usageCount ?? 0,
    favoriteCount: template.favoriteCount ?? 0,
    createdAt: template.createdAt,
  };
};

const enrichTemplatesForPublicListResponse = async (templates) => {
  const templatesWithCredits = await applyCreditsToListItems(templates);

  const categoryIds = new Set();
  const providerIds = new Set();
  const providerModelIds = new Set();

  for (const t of templatesWithCredits) {
    const categoryId = t.category && typeof t.category === 'object' ? t.category._id || t.category.id : t.category;
    if (categoryId) {
      categoryIds.add(String(categoryId));
    }

    for (const p of t.supportedProviders || []) {
      const providerId = p && typeof p === 'object' ? p._id || p.id : p;
      if (providerId) {
        providerIds.add(String(providerId));
      }
    }

    for (const m of t.supportedProviderModels || []) {
      const modelId = m && typeof m === 'object' ? m._id || m.id : m;
      if (modelId) {
        providerModelIds.add(String(modelId));
      }
    }
  }

  const [categoryMap, providerMap, providerModelMap] = await Promise.all([
    buildCategoryMap(Array.from(categoryIds)),
    buildProviderMap(Array.from(providerIds)),
    buildProviderModelMap(Array.from(providerModelIds)),
  ]);

  return templatesWithCredits.map((t) =>
    normalizeTemplateListItem({ template: t, categoryMap, providerMap, providerModelMap }),
  );
};

const buildPricingLookupStage = () => ({
  $lookup: {
    from: ProviderPricingModel.collection.name,
    let: { providerIds: '$supportedProviders', duration: '$duration' },
    pipeline: [
      {
        $match: {
          $expr: {
            $and: [
              { $eq: ['$enabled', true] },
              { $in: ['$provider', '$$providerIds'] },
              { $eq: ['$duration', '$$duration'] },
            ],
          },
        },
      },
      { $project: { credits: 1, provider: 1, duration: 1 } },
    ],
    as: '_pricing',
  },
});

const buildCreditsAggregationPipeline = ({ baseMatch, sortKey, page, limit, minCredits, maxCredits }) => {
  const sort = templateSearchService.buildSort(sortKey);
  const skip = (page - 1) * limit;

  const matchCredits = {};
  if (minCredits !== null) {
    matchCredits.$gte = minCredits;
  }
  if (maxCredits !== null) {
    matchCredits.$lte = maxCredits;
  }

  const usesCreditsSort = ['credits', 'credits_low', 'credits_high'].includes(sortKey);
  const creditsSortAsc = usesCreditsSort && sortKey !== 'credits_high';

  return [
    { $match: baseMatch },
    buildPricingLookupStage(),
    {
      $addFields: {
        _minPricingCredits: { $min: '$_pricing.credits' },
      },
    },
    {
      $addFields: {
        creditsRequired: { $ifNull: ['$creditsOverride', '$_minPricingCredits'] },
      },
    },
    ...(minCredits !== null || maxCredits !== null
      ? [{ $match: { creditsRequired: { ...matchCredits } } }]
      : []),
    ...(usesCreditsSort
      ? [
          {
            $addFields: {
              _creditsSortKey: {
                $ifNull: [
                  '$creditsRequired',
                  creditsSortAsc ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER,
                ],
              },
            },
          },
        ]
      : []),
    {
      $facet: {
        items: [
          {
            $sort: usesCreditsSort
              ? { _creditsSortKey: creditsSortAsc ? 1 : -1, createdAt: -1 }
              : sort,
          },
          { $skip: skip },
          { $limit: limit },
          { $project: { ...TEMPLATE_LIST_PROJECTION, creditsRequired: 1 } },
        ],
        meta: [{ $count: 'total' }],
      },
    },
  ];
};

const listTemplates = async ({ query }) => {
  const validated = templateValidationService.validateListQuery(query);

  const [category, provider, providerModel] = await Promise.all([
    templateValidationService.resolveCategoryBySlug(validated.categorySlug),
    templateValidationService.resolveProviderBySlug(validated.providerSlug),
    templateValidationService.resolveProviderModelBySlug(validated.providerModelSlug),
  ]);

  const resolvedRefs = { category, provider, providerModel };
  const filter = templateSearchService.buildTemplateFilter({ validatedQuery: validated, resolvedRefs });
  const { page, limit, skip } = templateSearchService.buildPagination({
    page: validated.page,
    limit: validated.limit,
  });

  const requiresCreditsAggregation =
    validated.minCredits !== null ||
    validated.maxCredits !== null ||
    ['credits', 'credits_low', 'credits_high'].includes(validated.sort);

  if (requiresCreditsAggregation) {
    const pipeline = buildCreditsAggregationPipeline({
      baseMatch: filter,
      sortKey: validated.sort,
      page,
      limit,
      minCredits: validated.minCredits,
      maxCredits: validated.maxCredits,
    });
    const [result] = await VideoTemplateModel.aggregate(pipeline);
    const items = result?.items || [];
    const total = result?.meta?.[0]?.total || 0;
    const normalizedItems = await enrichTemplatesForPublicListResponse(items);
    return { items: normalizedItems, meta: buildPaginationMeta({ page, limit, total }) };
  }

  const sort = templateSearchService.buildSort(validated.sort);
  const [items, total] = await Promise.all([
    VideoTemplateModel.find(filter).sort(sort).skip(skip).limit(limit).select(TEMPLATE_LIST_PROJECTION).lean(),
    VideoTemplateModel.countDocuments(filter),
  ]);

  const normalizedItems = await enrichTemplatesForPublicListResponse(items);

  return { items: normalizedItems, meta: buildPaginationMeta({ page, limit, total }) };
};

const getTemplateBySlug = async ({ slug }) => {
  const template = await VideoTemplateModel.findOne({
    slug: String(slug).toLowerCase(),
    status: 'active',
    ...buildAvailabilityWindow(),
  })
    .populate({ path: 'category', model: TemplateCategoryModel, select: { title: 1, slug: 1, description: 1, icon: 1, banner: 1 } })
    .populate({ path: 'supportedProviders', model: ProviderModel, select: { name: 1, slug: 1, enabled: 1 } })
    .populate({
      path: 'supportedProviderModels',
      model: ProviderModelModel,
      select: { name: 1, slug: 1, enabled: 1, provider: 1 },
    })
    .lean();

  if (!template) {
    throw new ApiError(404, 'Template not found.', { code: 'TEMPLATE_NOT_FOUND' });
  }

  const pricingDocs = await templateProviderService.fetchPricingForTemplates({ templates: [template] });
  const pricingMap = templateProviderService.buildMinCreditsMap(pricingDocs);
  const creditsRequired = templateProviderService.resolveCreditsRequired({ template, pricingMap });

  const recommendedTemplateIds = await templateRecommendationService.getRecommendedTemplateIds({
    categoryId: template.category?._id || template.category,
    excludeTemplateId: template._id,
    limit: 12,
  });

  const recommendationsRaw =
    recommendedTemplateIds.length === 0
      ? []
      : await VideoTemplateModel.find({
          _id: { $in: recommendedTemplateIds },
          status: 'active',
          ...buildAvailabilityWindow(),
        })
          .select(TEMPLATE_LIST_PROJECTION)
          .lean();

  const recommendations = await enrichTemplatesForPublicListResponse(recommendationsRaw);

  const category =
    template.category && typeof template.category === 'object'
      ? {
          id: template.category._id,
          title: template.category.title,
          slug: template.category.slug,
          description: template.category.description,
          icon: template.category.icon,
          banner: template.category.banner,
        }
      : null;

  const supportedProviders = (template.supportedProviders || []).map((p) => ({
    id: p._id,
    name: p.name,
    slug: p.slug,
    enabled: p.enabled,
  }));

  const supportedProviderModels = (template.supportedProviderModels || []).map((m) => ({
    id: m._id,
    name: m.name,
    slug: m.slug,
    enabled: m.enabled,
    provider: m.provider,
  }));

  return {
    id: template._id,
    title: template.title,
    slug: template.slug,
    description: template.description,
    thumbnail: template.thumbnail,
    previewImage: template.previewImage,
    previewImages: template.previewImages || [],
    previewVideo: template.previewVideo,
    previewVideos: template.previewVideos || [],
    category,
    tags: template.tags || [],
    premium: Boolean(template.premium),
    featured: Boolean(template.featured),
    trending: Boolean(template.trending),
    creditsRequired,
    prompt: template.prompt,
    negativePrompt: template.negativePrompt,
    requiredImages: template.requiredImages ?? 0,
    supportedProviders,
    supportedProviderModels,
    aspectRatio: template.aspectRatio,
    duration: template.duration,
    estimatedGenerationTimeMs: template.estimatedGenerationTimeMs ?? null,
    usageCount: template.usageCount ?? 0,
    favoriteCount: template.favoriteCount ?? 0,
    createdAt: template.createdAt,
    recommendations,
  };
};

const listTrending = async ({ limit = 20 } = {}) => {
  const safeLimit = Math.min(Number(limit) || 20, 100);
  const items = await VideoTemplateModel.find({ trending: true, status: 'active', ...buildAvailabilityWindow() })
    .sort({ usageCount: -1, createdAt: -1 })
    .limit(safeLimit)
    .select(TEMPLATE_LIST_PROJECTION)
    .lean();

  return enrichTemplatesForPublicListResponse(items);
};

const listFeatured = async ({ limit = 20 } = {}) => {
  const safeLimit = Math.min(Number(limit) || 20, 100);
  const items = await VideoTemplateModel.find({ featured: true, status: 'active', ...buildAvailabilityWindow() })
    .sort({ sortOrder: 1, trending: -1, createdAt: -1 })
    .limit(safeLimit)
    .select(TEMPLATE_LIST_PROJECTION)
    .lean();

  return enrichTemplatesForPublicListResponse(items);
};

const listRecommended = async () => ({
  items: [],
});

const searchTemplates = async ({ query }) => {
  const validated = templateValidationService.validateListQuery(query);
  const [category, provider, providerModel] = await Promise.all([
    templateValidationService.resolveCategoryBySlug(validated.categorySlug),
    templateValidationService.resolveProviderBySlug(validated.providerSlug),
    templateValidationService.resolveProviderModelBySlug(validated.providerModelSlug),
  ]);

  const resolvedRefs = { category, provider, providerModel };
  const filter = templateSearchService.buildTemplateFilter({ validatedQuery: validated, resolvedRefs });

  const { limit, skip, page } = templateSearchService.buildPagination({
    page: validated.page,
    limit: validated.limit,
  });

  const requiresCreditsAggregation =
    validated.minCredits !== null || validated.maxCredits !== null || false;

  if (requiresCreditsAggregation) {
    const pipeline = buildCreditsAggregationPipeline({
      baseMatch: filter,
      sortKey: 'newest',
      page,
      limit,
      minCredits: validated.minCredits,
      maxCredits: validated.maxCredits,
    });
    const [result] = await VideoTemplateModel.aggregate(pipeline);
    const items = result?.items || [];
    const total = result?.meta?.[0]?.total || 0;
    const normalizedItems = await enrichTemplatesForPublicListResponse(items);
    return { items: normalizedItems, meta: buildPaginationMeta({ page, limit, total }) };
  }

  const sort = templateSearchService.buildSort('newest');
  const [items, total] = await Promise.all([
    VideoTemplateModel.find(filter).sort(sort).skip(skip).limit(limit).select(TEMPLATE_LIST_PROJECTION).lean(),
    VideoTemplateModel.countDocuments(filter),
  ]);

  const normalizedItems = await enrichTemplatesForPublicListResponse(items);
  return { items: normalizedItems, meta: buildPaginationMeta({ page, limit, total }) };
};

const templateService = Object.freeze({
  listTemplates,
  getTemplateBySlug,
  listTrending,
  listFeatured,
  listRecommended,
  searchTemplates,
});

export default templateService;

export { TEMPLATE_LIST_PROJECTION, enrichTemplatesForPublicListResponse };
