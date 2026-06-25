import ProviderModel from '../../models/Provider.js';
import VideoGenerationJobModel from '../../models/VideoGenerationJob.js';
import VideoTemplateModel from '../../models/VideoTemplate.js';
import { buildPaginationMeta } from '../../utils/pagination.js';
import { buildGenerationJobDto } from '../../utils/generation.dto.js';
import generationAnalyticsService from './generationAnalyticsService.js';

const safeLower = (value) => (value ? String(value).trim().toLowerCase() : null);

const parseNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const buildFilter = async ({ userId, query }) => {
  const filter = { user: userId };

  if (query.status) {
    filter.status = safeLower(query.status);
  }

  if (query.provider) {
    const provider = await ProviderModel.findOne({ slug: safeLower(query.provider) }).lean();
    if (provider) {
      filter.provider = provider._id;
    }
  }

  if (query.template) {
    const template = await VideoTemplateModel.findOne({ slug: safeLower(query.template) }).lean();
    if (template) {
      filter.template = template._id;
    }
  }

  const from = query.from ? new Date(query.from) : null;
  const to = query.to ? new Date(query.to) : null;
  if ((from && !Number.isNaN(from.getTime())) || (to && !Number.isNaN(to.getTime()))) {
    filter.createdAt = {};
    if (from && !Number.isNaN(from.getTime())) {
      filter.createdAt.$gte = from;
    }
    if (to && !Number.isNaN(to.getTime())) {
      filter.createdAt.$lte = to;
    }
  }

  return filter;
};

const buildSort = (sortKey) => {
  switch (safeLower(sortKey)) {
    case 'oldest':
      return { createdAt: 1 };
    case 'status':
      return { status: 1, createdAt: -1 };
    default:
      return { createdAt: -1 };
  }
};

const listHistory = async ({ userId, query = {} }) => {
  const page = parseNumber(query.page) || 1;
  const limit = Math.min(parseNumber(query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  const filter = await buildFilter({ userId, query });
  const sort = buildSort(query.sort);

  const projection = {
    _id: 1,
    generationType: 1,
    outputType: 1,
    status: 1,
    provider: 1,
    template: 1,
    prompt: 1,
    negativePrompt: 1,
    inputImages: 1,
    inputVideos: 1,
    inputAudio: 1,
    referenceImages: 1,
    maskImages: 1,
    multipleOutputs: 1,
    outputAssets: 1,
    progress: 1,
    queuePosition: 1,
    estimatedCompletionTime: 1,
    costInCredits: 1,
    creditsUsed: 1,
    externalJobId: 1,
    outputVideo: 1,
    failureReason: 1,
    retryCount: 1,
    createdAt: 1,
    updatedAt: 1,
  };

  const [items, total, analytics] = await Promise.all([
    VideoGenerationJobModel.find(filter).sort(sort).skip(skip).limit(limit).select(projection).lean(),
    VideoGenerationJobModel.countDocuments(filter),
    generationAnalyticsService.summarizeByFilter({ filter }),
  ]);

  return {
    items: items.map(buildGenerationJobDto),
    meta: buildPaginationMeta({ page, limit, total }),
    analytics,
  };
};

const generationHistoryService = Object.freeze({
  listHistory,
});

export default generationHistoryService;
