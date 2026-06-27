/**
 * Template search service.
 * Builds MongoDB filters and sort configuration for template listing and search.
 */
const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildAvailabilityFilter = () => {
  const now = new Date();
  return {
    status: "active",
    $and: [
      { $or: [{ publishAt: null }, { publishAt: { $lte: now } }] },
      { $or: [{ expiresAt: null }, { expiresAt: { $gte: now } }] },
    ],
  };
};

const buildTemplateFilter = ({ validatedQuery, resolvedRefs }) => {
  const filter = buildAvailabilityFilter();

  if (resolvedRefs.category) {
    filter.category = resolvedRefs.category._id;
  }

  if (resolvedRefs.provider) {
    filter.supportedProviders = resolvedRefs.provider._id;
  }

  if (resolvedRefs.providerModel) {
    filter.supportedProviderModels = resolvedRefs.providerModel._id;
  }

  if (validatedQuery.premium !== null) {
    filter.premium = validatedQuery.premium;
  }

  if (validatedQuery.trending !== null) {
    filter.trending = validatedQuery.trending;
  }

  if (validatedQuery.featured !== null) {
    filter.featured = validatedQuery.featured;
  }

  if (validatedQuery.aspectRatio) {
    filter.aspectRatio = validatedQuery.aspectRatio;
  }

  if (validatedQuery.requiredImages !== null) {
    filter.requiredImages = validatedQuery.requiredImages;
  }

  const keyword = validatedQuery.keyword;
  const tagsRaw = validatedQuery.tagsRaw;

  if (keyword) {
    const keywords = String(keyword)
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 10);

    if (keywords.length > 0) {
      filter.$and = (filter.$and || []).concat(
        keywords.map((k) => {
          const escaped = escapeRegex(k);
          const regex = new RegExp(escaped, "i");
          return {
            $or: [
              { title: regex },
              { description: regex },
              { slug: regex },
              { tags: regex },
            ],
          };
        }),
      );
    }
  }

  if (tagsRaw) {
    const tags = String(tagsRaw)
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 25);
    if (tags.length === 1) {
      filter.tags = tags[0];
    } else if (tags.length > 1) {
      filter.tags = { $in: tags };
    }
  }

  return filter;
};

const buildSort = (sortKey) => {
  switch (sortKey) {
    case "oldest":
      return { createdAt: 1 };
    case "trending":
      return { trending: -1, usageCount: -1, createdAt: -1 };
    case "most_used":
      return { usageCount: -1, createdAt: -1 };
    case "featured":
      return { featured: -1, sortOrder: 1, createdAt: -1 };
    case "alphabetical":
      return { title: 1 };
    case "credits_low":
    case "credits":
      return { creditsOverride: 1, createdAt: -1 };
    case "credits_high":
      return { creditsOverride: -1, createdAt: -1 };
    case "newest":
    default:
      return { createdAt: -1 };
  }
};

const buildPagination = ({ page, limit }) => {
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const safeLimit =
    Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 20;
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
};

const templateSearchService = Object.freeze({
  buildTemplateFilter,
  buildSort,
  buildPagination,
});

export default templateSearchService;
