const GENERATION_TYPES = Object.freeze([
  'text_to_image',
  'image_to_image',
  'text_to_video',
  'image_to_video',
  'video_to_video',
  'image_upscale',
  'video_upscale',
  'image_edit',
  'video_edit',
  'background_remove',
  'face_swap',
  'audio_generation',
  'future_custom',
]);

const OUTPUT_TYPES = Object.freeze(['image', 'video', 'audio', 'zip', 'multiple_files']);

const FUTURE_MEDIA_MODULES = Object.freeze([
  'ai_avatar',
  'ai_character',
  'ai_talking_photo',
  'ai_lip_sync',
  'ai_voice',
  'ai_music',
  'ai_animation',
  '3d_generation',
  'multi_step_workflow',
  'batch_generation',
]);

const CAPABILITY_FIELD_MAP = Object.freeze({
  text_to_image: 'supportsTextToImage',
  image_to_image: 'supportsImageToImage',
  text_to_video: 'supportsTextToVideo',
  image_to_video: 'supportsImageToVideo',
  video_to_video: 'supportsVideoToVideo',
  image_upscale: 'supportsImageUpscale',
  video_upscale: 'supportsVideoUpscale',
  image_edit: 'supportsImageEditing',
  video_edit: 'supportsVideoEditing',
  background_remove: 'supportsBackgroundRemoval',
  face_swap: 'supportsFaceSwap',
  audio_generation: 'supportsAudioGeneration',
});

const normalizeGenerationType = (value, fallback = 'image_to_video') => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }

  const legacyAliases = {
    image_and_prompt: 'image_to_video',
    multi_image: 'image_to_video',
    video_extend: 'video_to_video',
    video_upscale: 'video_upscale',
  };

  return legacyAliases[normalized] || (GENERATION_TYPES.includes(normalized) ? normalized : fallback);
};

const normalizeOutputType = (value, fallback = 'video') => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }
  return OUTPUT_TYPES.includes(normalized) ? normalized : fallback;
};

const getSupportedOutputTypes = (entity = {}) => {
  const supported = [];
  if (entity.supportsImage) {
    supported.push('image');
  }
  if (entity.supportsVideo) {
    supported.push('video');
  }
  if (entity.supportsAudio || entity.supportsAudioGeneration) {
    supported.push('audio');
  }
  if (Number(entity.maximumOutputCount || 0) > 1) {
    supported.push('multiple_files');
  }
  return supported;
};

const getEntityCapabilityMatrix = (entity = {}) => ({
  supportsTextToImage: entity.supportsTextToImage ?? false,
  supportsImageToImage: entity.supportsImageToImage ?? false,
  supportsTextToVideo: entity.supportsTextToVideo ?? Boolean(entity.supportsVideo),
  supportsImageToVideo: entity.supportsImageToVideo ?? Boolean(entity.supportsImage && entity.supportsVideo),
  supportsVideoToVideo: entity.supportsVideoToVideo ?? false,
  supportsImageUpscale: entity.supportsImageUpscale ?? Boolean(entity.supportsImage),
  supportsVideoUpscale: entity.supportsVideoUpscale ?? false,
  supportsImageEditing: entity.supportsImageEditing ?? false,
  supportsVideoEditing: entity.supportsVideoEditing ?? false,
  supportsBackgroundRemoval: entity.supportsBackgroundRemoval ?? false,
  supportsFaceSwap: entity.supportsFaceSwap ?? false,
  supportsAudioGeneration: entity.supportsAudioGeneration ?? Boolean(entity.supportsAudio),
  supportsMultipleImages: entity.supportsMultipleImages ?? false,
  supportsReferenceImages: entity.supportsReferenceImages ?? false,
  supportsNegativePrompt: entity.supportsNegativePrompt ?? false,
  supportsMaskImage: entity.supportsMaskImage ?? false,
  maximumImages: entity.maximumImages ?? null,
  maximumDuration: entity.maximumDuration ?? null,
  maximumResolution: entity.maximumResolution || null,
  maximumOutputCount: entity.maximumOutputCount ?? null,
});

const supportsGenerationType = (entity, generationType) => {
  const normalized = normalizeGenerationType(generationType);
  const matrix = getEntityCapabilityMatrix(entity);
  const field = CAPABILITY_FIELD_MAP[normalized];
  return field ? Boolean(matrix[field]) : false;
};

const deriveTemplateGenerationType = (template = {}) => {
  if (template.generationType) {
    return normalizeGenerationType(template.generationType);
  }
  if (template.allowInputVideo) {
    return 'video_to_video';
  }
  if (template.requiredImages === 0 && template.allowPrompt) {
    return 'text_to_video';
  }
  return 'image_to_video';
};

const deriveTemplateOutputType = (template = {}) => {
  const supported = Array.isArray(template.supportedOutputTypes) ? template.supportedOutputTypes : [];
  if (supported.length > 0) {
    return normalizeOutputType(supported[0]);
  }
  return 'video';
};

export {
  CAPABILITY_FIELD_MAP,
  FUTURE_MEDIA_MODULES,
  GENERATION_TYPES,
  OUTPUT_TYPES,
  deriveTemplateGenerationType,
  deriveTemplateOutputType,
  getEntityCapabilityMatrix,
  getSupportedOutputTypes,
  normalizeGenerationType,
  normalizeOutputType,
  supportsGenerationType,
};
