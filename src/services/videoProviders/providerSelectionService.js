import ApiError from "../../utils/ApiError.js";
import ProviderModel from "../../models/Provider.js";
import ProviderModelModel from "../../models/ProviderModel.js";
import ProviderPricingModel from "../../models/ProviderPricing.js";
import providerHealthService from "./providerHealthService.js";
import providerPricingService from "./providerPricingService.js";
import { buildPublicProviderDto } from "../../utils/provider.dto.js";
import {
  getEntityCapabilityMatrix,
  normalizeGenerationType,
  normalizeOutputType,
  supportsGenerationType,
} from "../../utils/mediaGeneration.js";

const safeLower = (value) =>
  value ? String(value).trim().toLowerCase() : null;
const safeNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const getMinCreditsByProviderDuration = async (providerIds) => {
  if (providerIds.length === 0) {
    return new Map();
  }
  const rows = await ProviderPricingModel.aggregate([
    { $match: { enabled: true, provider: { $in: providerIds } } },
    {
      $group: {
        _id: { provider: "$provider", duration: "$duration" },
        minCredits: { $min: "$credits" },
      },
    },
  ]);

  const map = new Map();
  for (const row of rows) {
    map.set(
      `${String(row._id.provider)}:${Number(row._id.duration)}`,
      row.minCredits,
    );
  }
  return map;
};

const supportsOutputType = (entity, outputType) => {
  const normalized = normalizeOutputType(outputType);
  if (normalized === "image") {
    return Boolean(entity?.supportsImage);
  }
  if (normalized === "video") {
    return Boolean(entity?.supportsVideo);
  }
  if (normalized === "audio") {
    return Boolean(entity?.supportsAudio || entity?.supportsAudioGeneration);
  }
  if (normalized === "zip" || normalized === "multiple_files") {
    return true;
  }
  return false;
};

const isProviderCompatibleWithTemplate = ({
  provider,
  template,
  generationType,
  outputType,
  requestContext = {},
}) => {
  if (!supportsGenerationType(provider, generationType)) {
    return false;
  }
  if (!supportsOutputType(provider, outputType)) {
    return false;
  }

  const capabilities = getEntityCapabilityMatrix(provider);
  const minimumImages = Number.isFinite(Number(template?.minimumImages))
    ? Number(template.minimumImages)
    : Number.isFinite(Number(template?.requiredImages))
      ? Number(template.requiredImages)
      : 0;
  const requestedImageCount = Array.isArray(requestContext.inputImages)
    ? requestContext.inputImages.length
    : minimumImages;
  const requestedReferenceCount = Array.isArray(requestContext.referenceImages)
    ? requestContext.referenceImages.length
    : 0;
  const requestedMaskCount = Array.isArray(requestContext.maskImages)
    ? requestContext.maskImages.length
    : 0;
  const requestedOutputCount = requestContext.multipleOutputs
    ? Math.max(2, safeNumber(requestContext.requestedOutputCount) || 2)
    : 1;
  const maximumImages = safeNumber(capabilities.maximumImages);
  const maximumOutputCount = safeNumber(capabilities.maximumOutputCount);

  if (
    Math.max(minimumImages, requestedImageCount) > 1 &&
    !capabilities.supportsMultipleImages
  ) {
    return false;
  }
  if (maximumImages !== null && requestedImageCount > maximumImages) {
    return false;
  }
  if (
    (template?.allowReferenceImage || requestedReferenceCount > 0) &&
    !capabilities.supportsReferenceImages
  ) {
    return false;
  }
  if (
    (template?.allowNegativePrompt || requestContext.negativePrompt) &&
    !capabilities.supportsNegativePrompt
  ) {
    return false;
  }
  if (
    (template?.allowMaskImage || requestedMaskCount > 0) &&
    !capabilities.supportsMaskImage
  ) {
    return false;
  }
  if (
    requestContext.multipleOutputs &&
    maximumOutputCount !== null &&
    requestedOutputCount > maximumOutputCount
  ) {
    return false;
  }
  return true;
};

const listProviders = async () => {
  const providers = await ProviderModel.find({ enabled: true })
    .select({
      name: 1,
      slug: 1,
      enabled: 1,
      priority: 1,
      supportsImage: 1,
      supportsVideo: 1,
      supportsAudio: 1,
      supportsMultipleImages: 1,
      maximumDuration: 1,
      maximumResolution: 1,
    })
    .sort({ priority: 1, createdAt: -1 })
    .lean();

  const providerIds = providers.map((p) => p._id);

  const [models, minCreditsByDurationMap] = await Promise.all([
    ProviderModelModel.find({ enabled: true, provider: { $in: providerIds } })
      .select({
        provider: 1,
        name: 1,
        slug: 1,
        enabled: 1,
        priority: 1,
        credits: 1,
        estimatedTime: 1,
        supportsImage: 1,
        supportsVideo: 1,
        supportsAudio: 1,
        supportsMultipleImages: 1,
        supportsTextToImage: 1,
        supportsImageToImage: 1,
        supportsTextToVideo: 1,
        supportsImageToVideo: 1,
        supportsVideoToVideo: 1,
        supportsImageUpscale: 1,
        supportsVideoUpscale: 1,
        supportsImageEditing: 1,
        supportsVideoEditing: 1,
        supportsBackgroundRemoval: 1,
        supportsFaceSwap: 1,
        supportsAudioGeneration: 1,
        supportsReferenceImages: 1,
        supportsNegativePrompt: 1,
        supportsMaskImage: 1,
        maximumImages: 1,
        maximumDuration: 1,
        maximumResolution: 1,
        maximumOutputCount: 1,
      })
      .sort({ priority: 1, createdAt: -1 })
      .lean(),
    getMinCreditsByProviderDuration(providerIds),
  ]);

  const items = providers.map((p) => {
    const pricingSummary = [];
    for (const [key, minCredits] of minCreditsByDurationMap.entries()) {
      if (!key.startsWith(`${String(p._id)}:`)) {
        continue;
      }
      const duration = Number(key.split(":")[1]);
      pricingSummary.push({ duration, minCredits });
    }
    pricingSummary.sort((a, b) => a.duration - b.duration);

    const providerModels = models.filter(
      (m) => String(m.provider) === String(p._id),
    );
    return buildPublicProviderDto({
      provider: p,
      models: providerModels,
      pricingSummary,
    });
  });

  return { items };
};

const getProviderDetails = async (slug) => {
  const provider = await ProviderModel.findOne({
    slug: safeLower(slug),
    enabled: true,
  })
    .select({
      name: 1,
      slug: 1,
      enabled: 1,
      priority: 1,
      supportsImage: 1,
      supportsVideo: 1,
      supportsAudio: 1,
      supportsMultipleImages: 1,
      maximumDuration: 1,
      maximumResolution: 1,
    })
    .lean();

  if (!provider) {
    throw new ApiError(404, "Provider not found.", {
      code: "PROVIDER_NOT_FOUND",
    });
  }

  const [models, pricingSummary] = await Promise.all([
    ProviderModelModel.find({ provider: provider._id, enabled: true })
      .select({
        provider: 1,
        name: 1,
        slug: 1,
        enabled: 1,
        priority: 1,
        credits: 1,
        estimatedTime: 1,
        supportsImage: 1,
        supportsVideo: 1,
        supportsAudio: 1,
        supportsMultipleImages: 1,
        supportsTextToImage: 1,
        supportsImageToImage: 1,
        supportsTextToVideo: 1,
        supportsImageToVideo: 1,
        supportsVideoToVideo: 1,
        supportsImageUpscale: 1,
        supportsVideoUpscale: 1,
        supportsImageEditing: 1,
        supportsVideoEditing: 1,
        supportsBackgroundRemoval: 1,
        supportsFaceSwap: 1,
        supportsAudioGeneration: 1,
        supportsReferenceImages: 1,
        supportsNegativePrompt: 1,
        supportsMaskImage: 1,
        maximumImages: 1,
        maximumDuration: 1,
        maximumResolution: 1,
        maximumOutputCount: 1,
      })
      .sort({ priority: 1, createdAt: -1 })
      .lean(),
    ProviderPricingModel.aggregate([
      { $match: { enabled: true, provider: provider._id } },
      {
        $group: {
          _id: { duration: "$duration" },
          minCredits: { $min: "$credits" },
        },
      },
      { $sort: { "_id.duration": 1 } },
    ]),
  ]);

  return buildPublicProviderDto({
    provider,
    models,
    pricingSummary: pricingSummary.map((p) => ({
      duration: p._id.duration,
      minCredits: p.minCredits,
    })),
  });
};

const buildCandidates = async ({
  template = null,
  excludedProviderIds = [],
  generationType = null,
  outputType = null,
  requestContext = {},
} = {}) => {
  const supportedProviderIds = new Set(
    (template?.supportedProviders || []).map((p) => String(p)),
  );
  const supportedProviderModelIds = new Set(
    (template?.supportedProviderModels || []).map((m) => String(m)),
  );

  const providerFilter = {
    enabled: true,
    ...(excludedProviderIds.length > 0
      ? { _id: { $nin: excludedProviderIds } }
      : {}),
    ...(supportedProviderIds.size > 0
      ? { _id: { $in: Array.from(supportedProviderIds) } }
      : {}),
  };

  const providers = await ProviderModel.find(providerFilter)
    .select({
      _id: 1,
      name: 1,
      slug: 1,
      enabled: 1,
      priority: 1,
      healthStatus: 1,
      averageResponseTimeMs: 1,
      supportsImage: 1,
      supportsVideo: 1,
      supportsAudio: 1,
      supportsMultipleImages: 1,
      supportsTextToImage: 1,
      supportsImageToImage: 1,
      supportsTextToVideo: 1,
      supportsImageToVideo: 1,
      supportsVideoToVideo: 1,
      supportsImageUpscale: 1,
      supportsVideoUpscale: 1,
      supportsImageEditing: 1,
      supportsVideoEditing: 1,
      supportsBackgroundRemoval: 1,
      supportsFaceSwap: 1,
      supportsAudioGeneration: 1,
      supportsReferenceImages: 1,
      supportsNegativePrompt: 1,
      supportsMaskImage: 1,
      maximumImages: 1,
      maximumDuration: 1,
      maximumResolution: 1,
      maximumOutputCount: 1,
      dailyLimit: 1,
      timeout: 1,
      retryCount: 1,
      metadata: 1,
    })
    .sort({ priority: 1, createdAt: -1 })
    .lean();

  const eligibleProviders = providers.filter((p) => {
    try {
      providerHealthService.assertProviderEnabled(p);
      providerHealthService.assertProviderHealthAllowsUse(p);
      if (template && generationType && outputType) {
        return isProviderCompatibleWithTemplate({
          provider: p,
          template,
          generationType,
          outputType,
          requestContext,
        });
      }
      return true;
    } catch {
      return false;
    }
  });

  const providerIds = eligibleProviders.map((p) => p._id);
  const modelFilter = {
    enabled: true,
    provider: { $in: providerIds },
    ...(supportedProviderModelIds.size > 0
      ? { _id: { $in: Array.from(supportedProviderModelIds) } }
      : {}),
  };

  const models = await ProviderModelModel.find(modelFilter)
    .select({
      _id: 1,
      provider: 1,
      name: 1,
      slug: 1,
      enabled: 1,
      priority: 1,
      credits: 1,
      estimatedTime: 1,
      supportsImage: 1,
      supportsVideo: 1,
      supportsAudio: 1,
      supportsMultipleImages: 1,
      supportsTextToImage: 1,
      supportsImageToImage: 1,
      supportsTextToVideo: 1,
      supportsImageToVideo: 1,
      supportsVideoToVideo: 1,
      supportsImageUpscale: 1,
      supportsVideoUpscale: 1,
      supportsImageEditing: 1,
      supportsVideoEditing: 1,
      supportsBackgroundRemoval: 1,
      supportsFaceSwap: 1,
      supportsAudioGeneration: 1,
      supportsReferenceImages: 1,
      supportsNegativePrompt: 1,
      supportsMaskImage: 1,
      maximumImages: 1,
      maximumDuration: 1,
      maximumResolution: 1,
      maximumOutputCount: 1,
      metadata: 1,
    })
    .sort({ priority: 1, createdAt: -1 })
    .lean();

  const modelsByProviderId = new Map();
  for (const m of models) {
    const key = String(m.provider);
    if (!modelsByProviderId.has(key)) {
      modelsByProviderId.set(key, []);
    }
    modelsByProviderId.get(key).push(m);
  }

  return { providers: eligibleProviders, modelsByProviderId };
};

const pickModelForProvider = ({
  providerId,
  providerModelSlug = null,
  modelsByProviderId,
  template = null,
  generationType = null,
  outputType = null,
  requestContext = {},
}) => {
  let list = modelsByProviderId.get(String(providerId)) || [];
  if (template && generationType && outputType) {
    list = list.filter((model) =>
      isProviderCompatibleWithTemplate({
        provider: model,
        template,
        generationType,
        outputType,
        requestContext,
      }),
    );
  }
  if (providerModelSlug) {
    const slug = safeLower(providerModelSlug);
    return list.find((m) => m.slug === slug) || null;
  }
  if (list.length === 0) {
    return null;
  }
  return list.slice().sort((a, b) => (a.priority || 0) - (b.priority || 0))[0];
};

const selectProviderAndModel = async ({
  template = null,
  providerSlug = null,
  providerModelSlug = null,
  strategy = "priority",
  excludedProviderIds = [],
  executionContext = {},
} = {}) => {
  const resolvedGenerationType = normalizeGenerationType(
    executionContext.generationType ||
      template?.generationType ||
      "image_to_video",
  );
  const resolvedOutputType = normalizeOutputType(
    executionContext.outputType ||
      (Array.isArray(template?.supportedOutputTypes) &&
      template.supportedOutputTypes.length > 0
        ? template.supportedOutputTypes[0]
        : template?.outputType || "video"),
  );
  const { providers, modelsByProviderId } = await buildCandidates({
    template,
    excludedProviderIds,
    generationType: resolvedGenerationType,
    outputType: resolvedOutputType,
    requestContext: executionContext,
  });
  if (providers.length === 0) {
    throw new ApiError(400, "No available providers for this template.", {
      code: "NO_AVAILABLE_PROVIDERS",
    });
  }

  const normalizedProviderSlug = safeLower(providerSlug);
  const normalizedStrategy = safeLower(strategy) || "priority";

  if (normalizedProviderSlug) {
    const provider = providers.find((p) => p.slug === normalizedProviderSlug);
    if (!provider) {
      throw new ApiError(404, "Provider not found for this template.", {
        code: "PROVIDER_NOT_AVAILABLE",
      });
    }
    const model = pickModelForProvider({
      providerId: provider._id,
      providerModelSlug,
      modelsByProviderId,
      template,
      generationType: resolvedGenerationType,
      outputType: resolvedOutputType,
      requestContext: executionContext,
    });
    return { provider, model };
  }

  if (normalizedStrategy === "fastest") {
    const ranked = providers
      .map((p) => {
        const model = pickModelForProvider({
          providerId: p._id,
          providerModelSlug: null,
          modelsByProviderId,
          template,
          generationType: resolvedGenerationType,
          outputType: resolvedOutputType,
          requestContext: executionContext,
        });
        const modelTime =
          model?.estimatedTime && model.estimatedTime > 0
            ? model.estimatedTime
            : null;
        const providerTime =
          p.averageResponseTimeMs && p.averageResponseTimeMs > 0
            ? p.averageResponseTimeMs
            : null;
        const score = modelTime ?? providerTime ?? Number.MAX_SAFE_INTEGER;
        return { provider: p, model, score };
      })
      .sort(
        (a, b) =>
          a.score - b.score ||
          (a.provider.priority || 0) - (b.provider.priority || 0),
      );
    return { provider: ranked[0].provider, model: ranked[0].model };
  }

  if (normalizedStrategy === "cheapest") {
    const duration = template?.duration ?? null;
    const providerIds = providers.map((p) => p._id);
    const pricingMap = await getMinCreditsByProviderDuration(providerIds);

    const ranked = providers
      .map((p) => {
        const model = pickModelForProvider({
          providerId: p._id,
          providerModelSlug: null,
          modelsByProviderId,
          template,
          generationType: resolvedGenerationType,
          outputType: resolvedOutputType,
          requestContext: executionContext,
        });
        const key = `${String(p._id)}:${Number(duration)}`;
        const providerPricingCredits = pricingMap.has(key)
          ? pricingMap.get(key)
          : null;
        const modelCredits =
          model?.credits && model.credits > 0 ? model.credits : null;
        const baseCredits =
          template?.creditsOverride ??
          modelCredits ??
          providerPricingCredits ??
          null;
        const multiplier = Number(p?.metadata?.creditsMultiplier) || 1;
        const finalCredits =
          baseCredits === null
            ? Number.MAX_SAFE_INTEGER
            : Math.ceil(baseCredits * multiplier);
        return { provider: p, model, finalCredits };
      })
      .sort(
        (a, b) =>
          a.finalCredits - b.finalCredits ||
          (a.provider.priority || 0) - (b.provider.priority || 0),
      );

    return { provider: ranked[0].provider, model: ranked[0].model };
  }

  if (normalizedStrategy === "highest_quality") {
    const ranked = providers
      .map((p) => {
        const model = pickModelForProvider({
          providerId: p._id,
          providerModelSlug: null,
          modelsByProviderId,
          template,
          generationType: resolvedGenerationType,
          outputType: resolvedOutputType,
          requestContext: executionContext,
        });
        const score = (model?.priority ?? 0) * -1;
        return { provider: p, model, score };
      })
      .sort(
        (a, b) =>
          a.score - b.score ||
          (a.provider.priority || 0) - (b.provider.priority || 0),
      );
    return { provider: ranked[0].provider, model: ranked[0].model };
  }

  const provider = providers
    .slice()
    .sort((a, b) => (a.priority || 0) - (b.priority || 0))[0];
  const model = pickModelForProvider({
    providerId: provider._id,
    providerModelSlug,
    modelsByProviderId,
    template,
    generationType: resolvedGenerationType,
    outputType: resolvedOutputType,
    requestContext: executionContext,
  });
  return { provider, model };
};

const getPricing = async () => providerPricingService.getPricingSummary();

const providerSelectionService = Object.freeze({
  listProviders,
  getProviderDetails,
  selectProviderAndModel,
  getPricing,
});

export default providerSelectionService;
