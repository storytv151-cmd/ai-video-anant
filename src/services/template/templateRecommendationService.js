/**
 * Template recommendation service placeholder.
 * Future phases can add AI ranking, personalization, collaborative filtering,
 * and history-based recommendations without changing controller contracts.
 */
import VideoTemplateModel from '../../models/VideoTemplate.js';

const getRecommendedTemplateIds = async ({ categoryId = null, excludeTemplateId = null, limit = 10 } = {}) => {
  if (!categoryId) {
    return [];
  }

  const now = new Date();
  const items = await VideoTemplateModel.find({
    category: categoryId,
    status: 'active',
    ...(excludeTemplateId ? { _id: { $ne: excludeTemplateId } } : {}),
    $and: [
      { $or: [{ publishAt: null }, { publishAt: { $lte: now } }] },
      { $or: [{ expiresAt: null }, { expiresAt: { $gte: now } }] },
    ],
  })
    .sort({ trending: -1, usageCount: -1, createdAt: -1 })
    .limit(Math.min(limit, 25))
    .select({ _id: 1 })
    .lean();

  return items.map((t) => t._id);
};

const templateRecommendationService = Object.freeze({
  getRecommendedTemplateIds,
});

export default templateRecommendationService;
