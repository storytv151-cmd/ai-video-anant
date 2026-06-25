import ProviderModelModel from '../../models/ProviderModel.js';
import ProviderPricingModel from '../../models/ProviderPricing.js';
import ProviderModel from '../../models/Provider.js';
import ApiError from '../../utils/ApiError.js';
import providerHealthService from '../videoProviders/providerHealthService.js';
import providerPricingService from '../videoProviders/providerPricingService.js';
import adminAuditService from './adminAuditService.js';
import adminQueryService from './adminQueryService.js';

const PROVIDER_FIELDS = Object.freeze([
  'name',
  'slug',
  'enabled',
  'priority',
  'healthStatus',
  'supportsImage',
  'supportsVideo',
  'supportsMultipleImages',
  'supportsAudio',
  'supportsTextToImage',
  'supportsImageToImage',
  'supportsTextToVideo',
  'supportsImageToVideo',
  'supportsVideoToVideo',
  'supportsImageUpscale',
  'supportsVideoUpscale',
  'supportsImageEditing',
  'supportsVideoEditing',
  'supportsBackgroundRemoval',
  'supportsFaceSwap',
  'supportsAudioGeneration',
  'supportsReferenceImages',
  'supportsNegativePrompt',
  'supportsMaskImage',
  'maximumImages',
  'maximumDuration',
  'maximumResolution',
  'dailyLimit',
  'timeout',
  'retryCount',
  'creditsPerGeneration',
  'maximumOutputCount',
  'metadata',
]);

const PROVIDER_MODEL_FIELDS = Object.freeze([
  'name',
  'slug',
  'enabled',
  'priority',
  'credits',
  'estimatedTime',
  'supportsImage',
  'supportsVideo',
  'supportsAudio',
  'supportsTextToImage',
  'supportsImageToImage',
  'supportsTextToVideo',
  'supportsImageToVideo',
  'supportsVideoToVideo',
  'supportsImageUpscale',
  'supportsVideoUpscale',
  'supportsImageEditing',
  'supportsVideoEditing',
  'supportsBackgroundRemoval',
  'supportsFaceSwap',
  'supportsAudioGeneration',
  'supportsMultipleImages',
  'supportsReferenceImages',
  'supportsNegativePrompt',
  'supportsMaskImage',
  'maximumImages',
  'maximumDuration',
  'maximumResolution',
  'maximumOutputCount',
  'metadata',
]);

const pickFields = ({ payload = {}, fields = [] } = {}) =>
  fields.reduce((accumulator, field) => {
    if (payload[field] !== undefined) {
      accumulator[field] = payload[field];
    }
    return accumulator;
  }, {});

const listProviders = async ({ query = {} } = {}) => {
  const { page, limit, skip } = adminQueryService.buildPagination({
    page: query.page,
    limit: query.limit,
    maxLimit: 100,
  });
  const filter = {};
  if (query.enabled !== undefined) {
    filter.enabled = adminQueryService.parseBoolean(query.enabled, false);
  }
  if (query.healthStatus) {
    filter.healthStatus = String(query.healthStatus).trim().toLowerCase();
  }
  const searchRegex = adminQueryService.buildRegexSearch(query.search);
  if (searchRegex) {
    filter.$or = [{ name: searchRegex }, { slug: searchRegex }];
  }

  const [items, total] = await Promise.all([
    ProviderModel.find(filter).sort({ priority: 1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    ProviderModel.countDocuments(filter),
  ]);
  return adminQueryService.buildPaginatedResponse({ items, page, limit, total });
};

const getProvider = async ({ providerId } = {}) => {
  const provider = await ProviderModel.findById(providerId).lean();
  if (!provider) {
    throw new ApiError(404, 'Provider not found.', { code: 'PROVIDER_NOT_FOUND' });
  }
  const [models, pricing] = await Promise.all([
    ProviderModelModel.find({ provider: provider._id }).sort({ priority: 1 }).lean(),
    ProviderPricingModel.find({ provider: provider._id }).sort({ duration: 1, credits: 1 }).lean(),
  ]);
  return { provider, models, pricing };
};

const updateProvider = async ({ providerId, payload = {}, adminUserId = null, request = null } = {}) => {
  const provider = await ProviderModel.findById(providerId);
  if (!provider) {
    throw new ApiError(404, 'Provider not found.', { code: 'PROVIDER_NOT_FOUND' });
  }
  Object.assign(provider, pickFields({ payload, fields: PROVIDER_FIELDS }));
  await provider.save();

  await adminAuditService.logAdminAction({
    request,
    adminUserId,
    action: 'ADMIN_PROVIDER_UPDATED',
    targetType: 'Provider',
    targetId: provider._id,
    metadata: { slug: provider.slug, enabled: provider.enabled, priority: provider.priority },
  });

  return getProvider({ providerId: provider._id });
};

const listProviderModels = async ({ query = {} } = {}) => {
  const { page, limit, skip } = adminQueryService.buildPagination({
    page: query.page,
    limit: query.limit,
    maxLimit: 100,
  });
  const filter = {};
  if (query.providerId) {
    filter.provider = query.providerId;
  }
  if (query.enabled !== undefined) {
    filter.enabled = adminQueryService.parseBoolean(query.enabled, false);
  }
  const searchRegex = adminQueryService.buildRegexSearch(query.search);
  if (searchRegex) {
    filter.$or = [{ name: searchRegex }, { slug: searchRegex }];
  }

  const [items, total] = await Promise.all([
    ProviderModelModel.find(filter).sort({ priority: 1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    ProviderModelModel.countDocuments(filter),
  ]);
  return adminQueryService.buildPaginatedResponse({ items, page, limit, total });
};

const updateProviderModel = async ({ modelId, payload = {}, adminUserId = null, request = null } = {}) => {
  const model = await ProviderModelModel.findById(modelId);
  if (!model) {
    throw new ApiError(404, 'Provider model not found.', { code: 'PROVIDER_MODEL_NOT_FOUND' });
  }
  Object.assign(model, pickFields({ payload, fields: PROVIDER_MODEL_FIELDS }));
  await model.save();

  await adminAuditService.logAdminAction({
    request,
    adminUserId,
    action: 'ADMIN_PROVIDER_MODEL_UPDATED',
    targetType: 'ProviderModel',
    targetId: model._id,
    metadata: { slug: model.slug, enabled: model.enabled, priority: model.priority },
  });

  return model.toObject();
};

const listPricing = async ({ query = {} } = {}) => {
  const filter = {};
  if (query.providerId) {
    filter.provider = query.providerId;
  }
  const items = await ProviderPricingModel.find(filter).sort({ provider: 1, duration: 1, credits: 1 }).lean();
  return { items };
};

const upsertPricing = async ({ payload = {}, adminUserId = null, request = null } = {}) => {
  if (!payload.provider || !payload.quality || payload.duration === undefined) {
    throw new ApiError(400, 'provider, quality, and duration are required.', {
      code: 'ADMIN_PROVIDER_PRICING_INPUT_REQUIRED',
    });
  }

  const pricing = await ProviderPricingModel.findOneAndUpdate(
    {
      provider: payload.provider,
      quality: String(payload.quality).trim().toLowerCase(),
      duration: Number(payload.duration),
    },
    {
      $set: {
        credits: Number(payload.credits || 0),
        currency: payload.currency || 'CREDITS',
        enabled: payload.enabled !== false,
      },
    },
    { new: true, upsert: true },
  );

  await adminAuditService.logAdminAction({
    request,
    adminUserId,
    action: 'ADMIN_PROVIDER_PRICING_UPDATED',
    targetType: 'ProviderPricing',
    targetId: pricing._id,
    metadata: {
      provider: payload.provider,
      quality: pricing.quality,
      duration: pricing.duration,
      credits: pricing.credits,
    },
  });

  return pricing.toObject();
};

const getHealthSummary = async () => providerHealthService.getHealthSummary();
const getPricingSummary = async () => providerPricingService.getPricingSummary();

const adminProviderService = Object.freeze({
  listProviders,
  getProvider,
  updateProvider,
  listProviderModels,
  updateProviderModel,
  listPricing,
  upsertPricing,
  getHealthSummary,
  getPricingSummary,
});

export default adminProviderService;
