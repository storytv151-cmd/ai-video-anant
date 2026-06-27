import {
  getEntityCapabilityMatrix,
  getSupportedOutputTypes,
} from "./mediaGeneration.js";

const safeNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const buildPublicProviderModelDto = (model) => {
  const capabilities = getEntityCapabilityMatrix(model);
  return {
    name: model.name,
    slug: model.slug,
    enabled: Boolean(model.enabled),
    estimatedTimeMs: safeNumber(model.estimatedTime) ?? null,
    credits: safeNumber(model.credits) ?? null,
    supports: {
      image: Boolean(model.supportsImage),
      video: Boolean(model.supportsVideo),
      audio: Boolean(model.supportsAudio),
      multipleImages: Boolean(model.supportsMultipleImages),
      outputTypes: getSupportedOutputTypes(model),
    },
    generationTypes: {
      textToImage: Boolean(capabilities.supportsTextToImage),
      imageToImage: Boolean(capabilities.supportsImageToImage),
      textToVideo: Boolean(capabilities.supportsTextToVideo),
      imageToVideo: Boolean(capabilities.supportsImageToVideo),
      videoToVideo: Boolean(capabilities.supportsVideoToVideo),
      imageUpscale: Boolean(capabilities.supportsImageUpscale),
      videoUpscale: Boolean(capabilities.supportsVideoUpscale),
      imageEditing: Boolean(capabilities.supportsImageEditing),
      videoEditing: Boolean(capabilities.supportsVideoEditing),
      backgroundRemoval: Boolean(capabilities.supportsBackgroundRemoval),
      faceSwap: Boolean(capabilities.supportsFaceSwap),
      audioGeneration: Boolean(capabilities.supportsAudioGeneration),
    },
    inputs: {
      multipleImages: Boolean(capabilities.supportsMultipleImages),
      referenceImages: Boolean(capabilities.supportsReferenceImages),
      negativePrompt: Boolean(capabilities.supportsNegativePrompt),
      maskImage: Boolean(capabilities.supportsMaskImage),
    },
    limits: {
      maximumImages: safeNumber(capabilities.maximumImages) ?? null,
      maximumDuration: safeNumber(capabilities.maximumDuration) ?? null,
      maximumResolution: capabilities.maximumResolution || null,
      maximumOutputCount: safeNumber(capabilities.maximumOutputCount) ?? null,
    },
  };
};

const buildPublicProviderDto = ({
  provider,
  models = [],
  pricingSummary = [],
}) => {
  const capabilities = getEntityCapabilityMatrix(provider);
  const estimatedTimeMsCandidates = models
    .map((m) => safeNumber(m.estimatedTime))
    .filter((v) => v !== null && v > 0);

  const estimatedTimeMs =
    estimatedTimeMsCandidates.length > 0
      ? Math.min(...estimatedTimeMsCandidates)
      : null;

  return {
    name: provider.name,
    slug: provider.slug,
    logo: null,
    description: null,
    enabled: Boolean(provider.enabled),
    capabilities: {
      supports: {
        image: Boolean(provider.supportsImage),
        video: Boolean(provider.supportsVideo),
        audio: Boolean(provider.supportsAudio),
        multipleImages: Boolean(provider.supportsMultipleImages),
        outputTypes: getSupportedOutputTypes(provider),
      },
      generationTypes: {
        textToImage: Boolean(capabilities.supportsTextToImage),
        imageToImage: Boolean(capabilities.supportsImageToImage),
        textToVideo: Boolean(capabilities.supportsTextToVideo),
        imageToVideo: Boolean(capabilities.supportsImageToVideo),
        videoToVideo: Boolean(capabilities.supportsVideoToVideo),
        imageUpscale: Boolean(capabilities.supportsImageUpscale),
        videoUpscale: Boolean(capabilities.supportsVideoUpscale),
        imageEditing: Boolean(capabilities.supportsImageEditing),
        videoEditing: Boolean(capabilities.supportsVideoEditing),
        backgroundRemoval: Boolean(capabilities.supportsBackgroundRemoval),
        faceSwap: Boolean(capabilities.supportsFaceSwap),
        audioGeneration: Boolean(capabilities.supportsAudioGeneration),
      },
      inputs: {
        multipleImages: Boolean(capabilities.supportsMultipleImages),
        referenceImages: Boolean(capabilities.supportsReferenceImages),
        negativePrompt: Boolean(capabilities.supportsNegativePrompt),
        maskImage: Boolean(capabilities.supportsMaskImage),
      },
      limits: {
        maximumImages: safeNumber(capabilities.maximumImages) ?? null,
        maximumDuration: safeNumber(capabilities.maximumDuration) ?? null,
        maximumResolution: capabilities.maximumResolution || null,
        maximumOutputCount: safeNumber(capabilities.maximumOutputCount) ?? null,
      },
    },
    estimatedTimeMs,
    supportedModels: models.map(buildPublicProviderModelDto),
    pricingSummary: pricingSummary.map((p) => ({
      duration: safeNumber(p.duration) ?? null,
      minCredits: safeNumber(p.minCredits) ?? null,
    })),
  };
};

export { buildPublicProviderDto, buildPublicProviderModelDto };
