import ApiError from "../../utils/ApiError.js";
import ProviderModel from "../../models/Provider.js";
import ProviderModelModel from "../../models/ProviderModel.js";
import ProviderPricingModel from "../../models/ProviderPricing.js";
import BaseVideoProvider from "./baseProvider.js";
import KlingProvider from "./kling.js";
import LumaProvider from "./luma.js";
import NanoBananaProvider from "./nanoBanana.js";
import PikaProvider from "./pika.js";
import RunwayProvider from "./runway.js";

const providerInstanceCache = new Map();

const normalizeProviderDoc = (provider) => {
  if (!provider) {
    return null;
  }
  return {
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
  };
};

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

class GenericDbVideoProvider extends BaseVideoProvider {
  async getProviderInfo() {
    const provider = await ProviderModel.findOne({
      slug: this.providerSlug,
      enabled: true,
    }).lean();
    if (!provider) {
      throw new ApiError(404, "Provider not found.", {
        code: "PROVIDER_NOT_FOUND",
      });
    }

    const models = await ProviderModelModel.find({
      provider: provider._id,
      enabled: true,
    })
      .sort({ priority: 1, createdAt: -1 })
      .lean();

    return {
      provider: normalizeProviderDoc(provider),
      models: models.map(normalizeProviderModelDoc),
    };
  }

  async healthCheck() {
    const provider = await ProviderModel.findOne({
      slug: this.providerSlug,
    }).lean();
    if (!provider) {
      throw new ApiError(404, "Provider not found.", {
        code: "PROVIDER_NOT_FOUND",
      });
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
    const provider = await ProviderModel.findOne({
      slug: this.providerSlug,
      enabled: true,
    }).lean();
    if (!provider) {
      throw new ApiError(404, "Provider not found.", {
        code: "PROVIDER_NOT_FOUND",
      });
    }

    let providerModelDoc = null;
    if (providerModelSlug) {
      providerModelDoc = await ProviderModelModel.findOne({
        provider: provider._id,
        slug: String(providerModelSlug).toLowerCase(),
        enabled: true,
      }).lean();
      if (!providerModelDoc) {
        throw new ApiError(404, "Provider model not found.", {
          code: "PROVIDER_MODEL_NOT_FOUND",
        });
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

    const providerPricingCredits =
      pricingDocs.length > 0
        ? Math.min(...pricingDocs.map((p) => p.credits))
        : null;
    const modelCredits = providerModelDoc?.credits ?? null;
    const creditsRequired =
      template?.creditsOverride ??
      (modelCredits !== null && modelCredits !== 0
        ? modelCredits
        : providerPricingCredits);

    return {
      providerSlug: this.providerSlug,
      providerModelSlug: providerModelDoc?.slug || null,
      templateSlug: template?.slug || null,
      creditsRequired: creditsRequired ?? null,
      status: "queued",
      externalJobId: null,
      queuedAt: new Date().toISOString(),
    };
  }

  async checkStatus() {
    return {
      providerSlug: this.providerSlug,
      status: "unknown",
      externalJobId: null,
    };
  }

  async cancelGeneration() {
    return {
      providerSlug: this.providerSlug,
      cancelled: false,
      externalJobId: null,
    };
  }
}

const createProviderInstance = ({ providerSlug }) => {
  switch (String(providerSlug).toLowerCase()) {
    case "nano-banana":
      return new NanoBananaProvider({ providerSlug });
    case "kling":
      return new KlingProvider({ providerSlug });
    case "pika":
      return new PikaProvider({ providerSlug });
    case "runway":
      return new RunwayProvider({ providerSlug });
    case "luma":
      return new LumaProvider({ providerSlug });
    default:
      return new GenericDbVideoProvider({ providerSlug });
  }
};

const createVideoProvider = async ({ providerSlug, useCache = true } = {}) => {
  const slug = String(providerSlug || "").toLowerCase();
  if (!slug) {
    throw new ApiError(400, "providerSlug is required.", {
      code: "PROVIDER_SLUG_REQUIRED",
    });
  }

  if (useCache && providerInstanceCache.has(slug)) {
    return providerInstanceCache.get(slug);
  }

  const instance = createProviderInstance({ providerSlug: slug });
  if (useCache) {
    providerInstanceCache.set(slug, instance);
  }
  return instance;
};

export { createVideoProvider };
