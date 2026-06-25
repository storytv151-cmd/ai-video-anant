import ApiError from '../../utils/ApiError.js';
import ProviderModel from '../../models/Provider.js';
import ProviderModelModel from '../../models/ProviderModel.js';
import ProviderPricingModel from '../../models/ProviderPricing.js';
import BaseVideoProvider from './baseProvider.js';

const normalizeProviderDoc = (provider) => ({
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
  lastSuccessAt: provider.lastSuccessAt,
  lastFailureAt: provider.lastFailureAt,
  metadata: provider.metadata || {},
});

const normalizeProviderModelDoc = (model) => ({
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
  metadata: model.metadata || {},
});

class RunwayProvider extends BaseVideoProvider {
  async getProviderInfo() {
    const provider = await ProviderModel.findOne({ slug: this.providerSlug, enabled: true }).lean();
    if (!provider) {
      throw new ApiError(404, 'Provider not found.', { code: 'PROVIDER_NOT_FOUND' });
    }
    const models = await ProviderModelModel.find({ provider: provider._id, enabled: true })
      .sort({ priority: 1, createdAt: -1 })
      .lean();
    return { provider: normalizeProviderDoc(provider), models: models.map(normalizeProviderModelDoc) };
  }

  async healthCheck() {
    const provider = await ProviderModel.findOne({ slug: this.providerSlug }).lean();
    if (!provider) {
      throw new ApiError(404, 'Provider not found.', { code: 'PROVIDER_NOT_FOUND' });
    }
    return {
      providerSlug: this.providerSlug,
      healthStatus: provider.healthStatus,
      lastSuccessAt: provider.lastSuccessAt,
      lastFailureAt: provider.lastFailureAt,
      errorCount: provider.errorCount,
      averageResponseTimeMs: provider.averageResponseTimeMs,
    };
  }

  async startGeneration({ template, providerModelSlug = null } = {}) {
    const provider = await ProviderModel.findOne({ slug: this.providerSlug, enabled: true }).lean();
    if (!provider) {
      throw new ApiError(404, 'Provider not found.', { code: 'PROVIDER_NOT_FOUND' });
    }

    let providerModelDoc = null;
    if (providerModelSlug) {
      providerModelDoc = await ProviderModelModel.findOne({
        provider: provider._id,
        slug: String(providerModelSlug).toLowerCase(),
        enabled: true,
      }).lean();
      if (!providerModelDoc) {
        throw new ApiError(404, 'Provider model not found.', { code: 'PROVIDER_MODEL_NOT_FOUND' });
      }
    }

    const duration = template?.duration ?? null;
    const pricingDocs =
      Number.isFinite(duration) && duration > 0
        ? await ProviderPricingModel.find({
            enabled: true,
            provider: provider._id,
            duration,
          })
            .select({ credits: 1 })
            .lean()
        : [];

    const providerPricingCredits = pricingDocs.length > 0 ? Math.min(...pricingDocs.map((p) => p.credits)) : null;
    const modelCredits = providerModelDoc?.credits ?? null;
    const creditsRequired =
      template?.creditsOverride ?? (modelCredits !== null && modelCredits !== 0 ? modelCredits : providerPricingCredits);

    return {
      providerSlug: this.providerSlug,
      providerModelSlug: providerModelDoc?.slug || null,
      templateSlug: template?.slug || null,
      creditsRequired: creditsRequired ?? null,
      status: 'queued',
      externalJobId: null,
      queuedAt: new Date().toISOString(),
    };
  }

  async checkStatus() {
    return { providerSlug: this.providerSlug, status: 'unknown', externalJobId: null };
  }

  async cancelGeneration() {
    return { providerSlug: this.providerSlug, cancelled: false, externalJobId: null };
  }
}

export default RunwayProvider;
