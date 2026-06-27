import ApiError from "../../utils/ApiError.js";
import AppSettingModel from "../../models/AppSetting.js";
import ProviderModel from "../../models/Provider.js";
import ProviderModelModel from "../../models/ProviderModel.js";
import VideoGenerationJobModel from "../../models/VideoGenerationJob.js";
import VideoTemplateModel from "../../models/VideoTemplate.js";
import WalletModel from "../../models/Wallet.js";
import {
  deriveTemplateGenerationType,
  deriveTemplateOutputType,
  normalizeGenerationType,
  normalizeOutputType,
} from "../../utils/mediaGeneration.js";

const indexSettings = (docs) => {
  const map = new Map();
  for (const doc of docs) {
    const section = doc.section || "GENERAL";
    const key = doc.key || "global";
    map.set(`${section}:${key}`, doc);
  }
  return map;
};

const getSetting = (map, section, key = "global") =>
  map.get(`${section}:${key}`) || null;

const pick = (value, fallback = null) =>
  value === undefined ? fallback : value;

const getGenerationSettings = async () => {
  const docs = await AppSettingModel.find({}).lean();
  const settingsIndex = indexSettings(docs);
  const system =
    getSetting(settingsIndex, "SYSTEM") || getSetting(settingsIndex, "GENERAL");
  const limits = getSetting(settingsIndex, "LIMITS") || system;
  const storage = getSetting(settingsIndex, "STORAGE") || system;
  const features = getSetting(settingsIndex, "FEATURES") || system;

  return {
    maintenanceMode: Boolean(pick(system?.maintenanceMode, false)),
    mediaGenerationEnabled: Boolean(
      pick(
        system?.mediaGenerationEnabled,
        pick(system?.videoGenerationEnabled, true),
      ),
    ),
    videoGenerationEnabled: Boolean(pick(system?.videoGenerationEnabled, true)),
    uploadLimits: pick(limits?.uploadLimits, {}),
    apiLimits: pick(limits?.apiLimits, pick(system?.apiLimits, {})),
    storageSettings: pick(storage?.storageSettings, {}),
    featureToggles: pick(features?.featureToggles, {}),
  };
};

const assertGenerationEnabled = (settings) => {
  if (settings.maintenanceMode) {
    throw new ApiError(503, "Service is under maintenance.", {
      code: "MAINTENANCE_MODE",
    });
  }
  if (!settings.mediaGenerationEnabled) {
    throw new ApiError(403, "Media generation is disabled.", {
      code: "VIDEO_GENERATION_DISABLED",
    });
  }
};

const resolveTemplateBySlug = async (templateSlug) => {
  const slug = String(templateSlug || "").toLowerCase();
  if (!slug) {
    throw new ApiError(400, "templateSlug is required.", {
      code: "TEMPLATE_SLUG_REQUIRED",
    });
  }

  const now = new Date();
  const template = await VideoTemplateModel.findOne({
    slug,
    status: "active",
    $and: [
      { $or: [{ publishAt: null }, { publishAt: { $lte: now } }] },
      { $or: [{ expiresAt: null }, { expiresAt: { $gte: now } }] },
    ],
  }).lean();

  if (!template) {
    throw new ApiError(404, "Template not found.", {
      code: "TEMPLATE_NOT_FOUND",
    });
  }

  return template;
};

const resolveProviderBySlug = async (providerSlug) => {
  if (!providerSlug) {
    return null;
  }
  const provider = await ProviderModel.findOne({
    slug: String(providerSlug).toLowerCase(),
  }).lean();
  if (!provider) {
    throw new ApiError(404, "Provider not found.", {
      code: "PROVIDER_NOT_FOUND",
    });
  }
  if (!provider.enabled) {
    throw new ApiError(400, "Provider is disabled.", {
      code: "PROVIDER_DISABLED",
    });
  }
  if (
    provider.healthStatus === "offline" ||
    provider.healthStatus === "maintenance"
  ) {
    throw new ApiError(400, "Provider is not available.", {
      code: "PROVIDER_UNAVAILABLE",
    });
  }
  return provider;
};

const resolveProviderModelBySlug = async ({
  providerId,
  providerModelSlug,
}) => {
  if (!providerModelSlug) {
    return null;
  }
  const query = {
    slug: String(providerModelSlug).toLowerCase(),
    enabled: true,
  };
  if (providerId) {
    query.provider = providerId;
  }
  const model = await ProviderModelModel.findOne(query).lean();
  if (!model) {
    throw new ApiError(404, "Provider model not found.", {
      code: "PROVIDER_MODEL_NOT_FOUND",
    });
  }
  return model;
};

const resolveWallet = async ({ userId }) => {
  const wallet = await WalletModel.findOne({ user: userId }).lean();
  if (!wallet) {
    throw new ApiError(404, "Wallet not found.", { code: "WALLET_NOT_FOUND" });
  }
  if (wallet.status !== "active") {
    throw new ApiError(403, "Wallet is not active.", {
      code: "WALLET_NOT_ACTIVE",
    });
  }
  return wallet;
};

const assertUserConcurrencyLimits = async ({ userId, maxConcurrentJobs }) => {
  if (!Number.isFinite(maxConcurrentJobs) || maxConcurrentJobs <= 0) {
    return;
  }
  const activeCount = await VideoGenerationJobModel.countDocuments({
    user: userId,
    status: { $in: ["pending", "queued", "processing"] },
  });
  if (activeCount >= maxConcurrentJobs) {
    throw new ApiError(429, "Too many active generation jobs.", {
      code: "GENERATION_CONCURRENCY_LIMIT",
    });
  }
};

const getNumericToggle = (featureToggles, key) => {
  if (!featureToggles) {
    return null;
  }
  const raw = featureToggles.get
    ? featureToggles.get(key)
    : featureToggles[key];
  if (raw === undefined || raw === null || raw === "") {
    return null;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

const normalizeTemplateMediaConfig = (template = {}) => {
  const minimumImages = Number.isFinite(Number(template.minimumImages))
    ? Number(template.minimumImages)
    : Number.isFinite(Number(template.requiredImages))
      ? Number(template.requiredImages)
      : 0;

  const maximumImages = Number.isFinite(Number(template.maximumImages))
    ? Number(template.maximumImages)
    : Number.isFinite(Number(template.requiredImages))
      ? Math.max(Number(template.requiredImages), minimumImages)
      : minimumImages;

  return {
    generationType: normalizeGenerationType(
      template.generationType || deriveTemplateGenerationType(template),
    ),
    outputType: normalizeOutputType(
      template.outputType || deriveTemplateOutputType(template),
    ),
    inputType: template.inputType || "image",
    minimumImages,
    maximumImages,
    allowPrompt: Boolean(template.allowPrompt || minimumImages === 0),
    allowNegativePrompt: Boolean(template.allowNegativePrompt),
    allowReferenceImage: Boolean(template.allowReferenceImage),
    allowMaskImage: Boolean(template.allowMaskImage),
    allowInputVideo: Boolean(template.allowInputVideo),
    allowInputAudio: Boolean(template.allowInputAudio),
    allowMultipleOutputs: Boolean(template.allowMultipleOutputs),
    supportedOutputTypes:
      Array.isArray(template.supportedOutputTypes) &&
      template.supportedOutputTypes.length > 0
        ? template.supportedOutputTypes
            .map((value) => normalizeOutputType(value))
            .filter(Boolean)
        : [
            normalizeOutputType(
              template.outputType || deriveTemplateOutputType(template),
            ),
          ],
    defaultAspectRatio:
      template.defaultAspectRatio || template.aspectRatio || "16:9",
  };
};

const validateGenerationPayload = ({ template, payload = {} } = {}) => {
  const config = normalizeTemplateMediaConfig(template);
  const generationType = normalizeGenerationType(
    payload.generationType || config.generationType,
  );
  const outputType = normalizeOutputType(
    payload.outputType || config.outputType,
  );

  const inputImages = Array.isArray(payload.inputImages)
    ? payload.inputImages
    : [];
  const inputVideos = Array.isArray(payload.inputVideos)
    ? payload.inputVideos
    : [];
  const inputAudio = Array.isArray(payload.inputAudio)
    ? payload.inputAudio
    : [];
  const referenceImages = Array.isArray(payload.referenceImages)
    ? payload.referenceImages
    : [];
  const maskImages = Array.isArray(payload.maskImages)
    ? payload.maskImages
    : [];
  const prompt = payload.prompt ? String(payload.prompt).trim() : null;
  const negativePrompt = payload.negativePrompt
    ? String(payload.negativePrompt).trim()
    : null;
  const imageDrivenTypes = [
    "image_to_video",
    "image_to_image",
    "image_upscale",
    "image_edit",
    "background_remove",
    "face_swap",
  ];
  const videoDrivenTypes = ["video_to_video", "video_upscale", "video_edit"];

  const requirePrompt =
    generationType === "text_to_image" ||
    generationType === "text_to_video" ||
    config.allowPrompt;
  if (
    requirePrompt &&
    !prompt &&
    (generationType === "text_to_image" || generationType === "text_to_video")
  ) {
    throw new ApiError(400, "Prompt is required for this generation type.", {
      code: "PROMPT_REQUIRED",
    });
  }

  if (imageDrivenTypes.includes(generationType)) {
    if (inputImages.length < Math.max(1, config.minimumImages)) {
      throw new ApiError(400, "At least one input image is required.", {
        code: "IMAGE_INPUT_REQUIRED",
      });
    }
  }

  if (
    Number.isFinite(Number(config.maximumImages)) &&
    Number(config.maximumImages) >= 0 &&
    inputImages.length > Number(config.maximumImages)
  ) {
    throw new ApiError(400, "Too many input images were provided.", {
      code: "IMAGE_INPUT_LIMIT",
    });
  }

  if (videoDrivenTypes.includes(generationType) && inputVideos.length === 0) {
    throw new ApiError(400, "At least one input video is required.", {
      code: "VIDEO_INPUT_REQUIRED",
    });
  }

  if (
    generationType === "audio_generation" &&
    !prompt &&
    inputAudio.length === 0
  ) {
    throw new ApiError(400, "Prompt or input audio is required.", {
      code: "AUDIO_INPUT_REQUIRED",
    });
  }

  if (
    !config.allowInputVideo &&
    !videoDrivenTypes.includes(generationType) &&
    inputVideos.length > 0
  ) {
    throw new ApiError(400, "Input video is not allowed for this template.", {
      code: "VIDEO_INPUT_NOT_ALLOWED",
    });
  }

  if (
    !config.allowInputAudio &&
    generationType !== "audio_generation" &&
    inputAudio.length > 0
  ) {
    throw new ApiError(400, "Input audio is not allowed for this template.", {
      code: "AUDIO_INPUT_NOT_ALLOWED",
    });
  }

  if (!config.allowReferenceImage && referenceImages.length > 0) {
    throw new ApiError(
      400,
      "Reference images are not allowed for this template.",
      { code: "REFERENCE_IMAGE_NOT_ALLOWED" },
    );
  }

  if (!config.allowMaskImage && maskImages.length > 0) {
    throw new ApiError(400, "Mask images are not allowed for this template.", {
      code: "MASK_IMAGE_NOT_ALLOWED",
    });
  }

  if (!config.allowNegativePrompt && negativePrompt) {
    throw new ApiError(
      400,
      "Negative prompt is not allowed for this template.",
      { code: "NEGATIVE_PROMPT_NOT_ALLOWED" },
    );
  }

  if (
    config.supportedOutputTypes.length > 0 &&
    !config.supportedOutputTypes.includes(outputType)
  ) {
    throw new ApiError(400, "Output type is not supported by this template.", {
      code: "OUTPUT_TYPE_NOT_SUPPORTED",
    });
  }

  if (payload.multipleOutputs && !config.allowMultipleOutputs) {
    throw new ApiError(
      400,
      "Multiple outputs are not allowed for this template.",
      { code: "MULTIPLE_OUTPUTS_NOT_ALLOWED" },
    );
  }

  return {
    generationType,
    outputType,
    inputImages,
    inputVideos,
    inputAudio,
    referenceImages,
    maskImages,
    prompt,
    negativePrompt,
    multipleOutputs: Boolean(
      payload.multipleOutputs && config.allowMultipleOutputs,
    ),
    templateConfig: config,
  };
};

const generationValidationService = Object.freeze({
  getGenerationSettings,
  assertGenerationEnabled,
  resolveTemplateBySlug,
  resolveProviderBySlug,
  resolveProviderModelBySlug,
  resolveWallet,
  assertUserConcurrencyLimits,
  getNumericToggle,
  normalizeTemplateMediaConfig,
  validateGenerationPayload,
});

export default generationValidationService;
