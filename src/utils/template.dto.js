const buildTemplateDto = (template) => {
  if (!template) {
    return null;
  }

  const id = template._id || template.id || null;
  return {
    id,
    _id: id,
    name: template.name || null,
    slug: template.slug || null,
    description: template.description || null,
    duration: template.duration ?? null,
    status: template.status || null,
    requiredImages: template.requiredImages ?? null,
    inputType: template.inputType || null,
    generationType: template.generationType || null,
    minimumImages: template.minimumImages ?? null,
    maximumImages: template.maximumImages ?? null,
    allowPrompt: Boolean(template.allowPrompt),
    allowNegativePrompt: Boolean(template.allowNegativePrompt),
    allowReferenceImage: Boolean(template.allowReferenceImage),
    allowMaskImage: Boolean(template.allowMaskImage),
    allowInputVideo: Boolean(template.allowInputVideo),
    allowInputAudio: Boolean(template.allowInputAudio),
    allowMultipleOutputs: Boolean(template.allowMultipleOutputs),
    defaultAspectRatio: template.defaultAspectRatio || null,
    supportedOutputTypes: Array.isArray(template.supportedOutputTypes)
      ? template.supportedOutputTypes
      : [],
    creditsOverride: template.creditsOverride ?? null,
    provider: template.provider || null,
    providerModel: template.providerModel || null,
    thumbnailUrl: template.thumbnailUrl || null,
    tags: Array.isArray(template.tags) ? template.tags : [],
    createdAt: template.createdAt || null,
    updatedAt: template.updatedAt || null,
  };
};

export { buildTemplateDto };
