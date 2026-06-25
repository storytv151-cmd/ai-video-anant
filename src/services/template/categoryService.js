/**
 * Category service.
 * Provides public category browsing APIs with scalable aggregation patterns.
 */
import TemplateCategoryModel from '../../models/TemplateCategory.js';
import VideoTemplateModel from '../../models/VideoTemplate.js';
import { enrichTemplatesForPublicListResponse, TEMPLATE_LIST_PROJECTION } from './templateService.js';

const buildPublicCategoryProjection = () => ({
  _id: 1,
  title: 1,
  slug: 1,
  description: 1,
  icon: 1,
  banner: 1,
  sortOrder: 1,
  featured: 1,
  status: 1,
  createdAt: 1,
});

const listCategories = async () => {
  const categories = await TemplateCategoryModel.find({ status: 'active' })
    .sort({ featured: -1, sortOrder: 1, createdAt: -1 })
    .select(buildPublicCategoryProjection())
    .lean();

  if (categories.length === 0) {
    return { items: [] };
  }

  const categoryIds = categories.map((c) => c._id);
  const now = new Date();

  const [countsAgg, featuredTemplates] = await Promise.all([
    VideoTemplateModel.aggregate([
      {
        $match: {
          status: 'active',
          category: { $in: categoryIds },
          $and: [
            { $or: [{ publishAt: null }, { publishAt: { $lte: now } }] },
            { $or: [{ expiresAt: null }, { expiresAt: { $gte: now } }] },
          ],
        },
      },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]),
    VideoTemplateModel.find({
      status: 'active',
      featured: true,
      category: { $in: categoryIds },
      $and: [
        { $or: [{ publishAt: null }, { publishAt: { $lte: now } }] },
        { $or: [{ expiresAt: null }, { expiresAt: { $gte: now } }] },
      ],
    })
      .sort({ trending: -1, usageCount: -1, sortOrder: 1, createdAt: -1 })
      .select(TEMPLATE_LIST_PROJECTION)
      .limit(200)
      .lean(),
  ]);

  const counts = {};
  for (const row of countsAgg) {
    counts[String(row._id)] = row.count;
  }

  const featuredTemplatesByCategory = {};
  const enrichedFeaturedTemplates = await enrichTemplatesForPublicListResponse(featuredTemplates);
  for (const template of enrichedFeaturedTemplates) {
    const key = template.category?.id ? String(template.category.id) : null;
    if (!key) {
      continue;
    }
    if (!featuredTemplatesByCategory[key]) {
      featuredTemplatesByCategory[key] = [];
    }
    if (featuredTemplatesByCategory[key].length < 6) {
      featuredTemplatesByCategory[key].push(template);
    }
  }

  const items = categories.map((c) => ({
    id: c._id,
    title: c.title,
    slug: c.slug,
    description: c.description,
    icon: c.icon,
    banner: c.banner,
    sortOrder: c.sortOrder,
    featured: c.featured,
    createdAt: c.createdAt,
    templateCount: counts[String(c._id)] || 0,
    featuredTemplates: featuredTemplatesByCategory[String(c._id)] || [],
  }));

  return { items };
};

const getCategoryBySlug = async (slug) => {
  const category = await TemplateCategoryModel.findOne({ slug: String(slug).toLowerCase(), status: 'active' })
    .select(buildPublicCategoryProjection())
    .lean();

  if (!category) {
    return null;
  }

  const now = new Date();
  const [templateCount, featuredTemplates] = await Promise.all([
    VideoTemplateModel.countDocuments({
      status: 'active',
      category: category._id,
      $and: [
        { $or: [{ publishAt: null }, { publishAt: { $lte: now } }] },
        { $or: [{ expiresAt: null }, { expiresAt: { $gte: now } }] },
      ],
    }),
    VideoTemplateModel.find({
      status: 'active',
      category: category._id,
      featured: true,
      $and: [
        { $or: [{ publishAt: null }, { publishAt: { $lte: now } }] },
        { $or: [{ expiresAt: null }, { expiresAt: { $gte: now } }] },
      ],
    })
      .sort({ trending: -1, usageCount: -1, sortOrder: 1, createdAt: -1 })
      .limit(12)
      .select(TEMPLATE_LIST_PROJECTION)
      .lean(),
  ]);

  const enrichedFeatured = await enrichTemplatesForPublicListResponse(featuredTemplates);

  return {
    id: category._id,
    title: category.title,
    slug: category.slug,
    description: category.description,
    icon: category.icon,
    banner: category.banner,
    sortOrder: category.sortOrder,
    featured: category.featured,
    createdAt: category.createdAt,
    templateCount,
    featuredTemplates: enrichedFeatured,
  };
};

const categoryService = Object.freeze({
  listCategories,
  getCategoryBySlug,
});

export default categoryService;
