import ApiError from '../../utils/ApiError.js';
import ProviderModel from '../../models/Provider.js';
import ProviderModelModel from '../../models/ProviderModel.js';
import ProviderPricingModel from '../../models/ProviderPricing.js';
import providerHealthService from './providerHealthService.js';
import providerPricingService from './providerPricingService.js';

const safeLower = (value) => (value ? String(value).trim().toLowerCase() : null);

const buildProviderInternal = (provider) => ({
  id: provider._id,
  name: provider.name,
  slug: provider.slug,
  enabled: provider.enabled,
  priority: provider.priority,
  healthStatus: provider.healthStatus,
  supportsImage: provider.supportsImage,
  supportsVideo: provider.supportsVideo,
  supportsAudio: provider.supportsAudio,
  supportsMultipleImages: provider.supportsMultipleImages,
  maximumDuration: provider.maximumDuration,
  maximumResolution: provider.maximumResolution,
  dailyLimit: provider.dailyLimit,
  timeout: provider.timeout,
  retryCount: provider.retryCount,
  averageResponseTimeMs: provider.averageResponseTimeMs,
  totalRequests: provider.totalRequests,
  successfulRequests: provider.successfulRequests,
  failedRequests: provider.failedRequests,
  errorCount: provider.errorCount,
  lastSuccessAt: provider.lastSuccessAt,
  lastFailureAt: provider.lastFailureAt,
});

const buildProviderModelInternal = (model) => ({
  id: model._id,
  provider: model.provider,
  name: model.name,
  slug: model.slug,
  enabled: model.enabled,
  priority: model.priority,
  credits: model.credits,
  estimatedTime: model.estimatedTime,
  supportsImage: model.supportsImage,
  supportsVideo: model.supportsVideo,
  supportsAudio: model.supportsAudio,
  supportsMultipleImages: model.supportsMultipleImages,
  maximumDuration: model.maximumDuration,
  maximumResolution: model.maximumResolution,
});

const getMinCreditsByProviderDuration = async (providerIds) => {
  if (providerIds.length === 0) {
    return new Map();
  }
  const rows = await ProviderPricingModel.aggregate([
    { $match: { enabled: true, provider: { $in: providerIds } } },
    { $group: { _id: { provider: '$provider', duration: '$duration' }, minCredits: { $min: '$credits' } } },
  ]);

  const map = new Map();
  for (const row of rows) {
    map.set(`${String(row._id.provider)}:${Number(row._id.duration)}`, row.minCredits);
  }
  return map;
};

const listProvidersInternal = async () => {
  const providers = await ProviderModel.find({ enabled: true })
    .select({
      _id: 1,
      name: 1,
      slug: 1,
      enabled: 1,
      priority: 1,
      healthStatus: 1,
      supportsImage: 1,
      supportsVideo: 1,
      supportsAudio: 1,
      supportsMultipleImages: 1,
      maximumDuration: 1,
      maximumResolution: 1,
      dailyLimit: 1,
      timeout: 1,
      retryCount: 1,
      averageResponseTimeMs: 1,
      totalRequests: 1,
      successfulRequests: 1,
      failedRequests: 1,
      errorCount: 1,
      lastSuccessAt: 1,
      lastFailureAt: 1,
      metadata: 1,
    })
    .sort({ priority: 1, createdAt: -1 })
    .lean();

  const providerIds = providers.map((p) => p._id);
  const [models, minCreditsByDurationMap] = await Promise.all([
    ProviderModelModel.find({ provider: { $in: providerIds } })
      .sort({ priority: 1, createdAt: -1 })
      .lean(),
    getMinCreditsByProviderDuration(providerIds),
  ]);

  const modelsByProvider = new Map();
  for (const m of models) {
    const key = String(m.provider);
    if (!modelsByProvider.has(key)) {
      modelsByProvider.set(key, []);
    }
    modelsByProvider.get(key).push(buildProviderModelInternal(m));
  }

  const items = providers.map((p) => {
    const pricingSummary = [];
    for (const [key, minCredits] of minCreditsByDurationMap.entries()) {
      if (!key.startsWith(`${String(p._id)}:`)) {
        continue;
      }
      const duration = Number(key.split(':')[1]);
      pricingSummary.push({ duration, minCredits });
    }
    pricingSummary.sort((a, b) => a.duration - b.duration);
    return {
      provider: buildProviderInternal(p),
      models: modelsByProvider.get(String(p._id)) || [],
      pricingSummary,
    };
  });

  return { items };
};

const getProviderInternal = async (slug) => {
  const provider = await ProviderModel.findOne({ slug: safeLower(slug) }).lean();
  if (!provider) {
    throw new ApiError(404, 'Provider not found.', { code: 'PROVIDER_NOT_FOUND' });
  }

  const [models, pricingSummary] = await Promise.all([
    ProviderModelModel.find({ provider: provider._id }).sort({ priority: 1, createdAt: -1 }).lean(),
    ProviderPricingModel.aggregate([
      { $match: { enabled: true, provider: provider._id } },
      { $group: { _id: { duration: '$duration' }, minCredits: { $min: '$credits' } } },
      { $sort: { '_id.duration': 1 } },
    ]),
  ]);

  return {
    provider: buildProviderInternal(provider),
    models: models.map(buildProviderModelInternal),
    pricingSummary: pricingSummary.map((p) => ({ duration: p._id.duration, minCredits: p.minCredits })),
  };
};

const getHealthInternal = async () => providerHealthService.getHealthSummary();

const getPricingInternal = async () => providerPricingService.getPricingSummary();

const providerAdminService = Object.freeze({
  listProvidersInternal,
  getProviderInternal,
  getHealthInternal,
  getPricingInternal,
});

export default providerAdminService;
