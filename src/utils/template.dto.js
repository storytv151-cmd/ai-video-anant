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

