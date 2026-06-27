import ApiError from "../../utils/ApiError.js";
import ProviderModel from "../../models/Provider.js";
import ProviderModelModel from "../../models/ProviderModel.js";
import ProviderPricingModel from "../../models/ProviderPricing.js";

const safeNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const extractMultiplier = (provider) => {
  const multiplier = safeNumber(provider?.metadata?.creditsMultiplier);
  if (multiplier === null || multiplier <= 0) {
    return 1;
  }
  return multiplier;
};

const getProviderPricingCredits = async ({ providerId, duration }) => {
  if (!providerId || !Number.isFinite(duration) || duration <= 0) {
    return null;
  }
  const pricingDocs = await ProviderPricingModel.find({
    enabled: true,
    provider: providerId,
    duration,
  })
    .select({ credits: 1 })
    .lean();
  if (pricingDocs.length === 0) {
    return null;
  }
  return Math.min(...pricingDocs.map((p) => p.credits));
};

const resolveCredits = async ({
  template = null,
  providerSlug = null,
  providerModelSlug = null,
  duration = null,
} = {}) => {
  if (
    template?.creditsOverride !== null &&
    template?.creditsOverride !== undefined
  ) {
    return {
      templateOverride: template.creditsOverride,
      providerModelCredits: null,
      providerPricingCredits: null,
      multiplier: 1,
      finalCredits: template.creditsOverride,
    };
  }

  const provider = providerSlug
    ? await ProviderModel.findOne({
        slug: String(providerSlug).toLowerCase(),
        enabled: true,
      }).lean()
    : null;
  if (providerSlug && !provider) {
    throw new ApiError(404, "Provider not found.", {
      code: "PROVIDER_NOT_FOUND",
    });
  }

  const multiplier = provider ? extractMultiplier(provider) : 1;
  const effectiveDuration = Number.isFinite(Number(duration))
    ? Number(duration)
    : (template?.duration ?? null);

  let providerModelCredits = null;
  let providerModelDoc = null;
  if (provider && providerModelSlug) {
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
    const c = safeNumber(providerModelDoc.credits);
    providerModelCredits = c !== null && c > 0 ? c : null;
  }

  const providerPricingCredits = provider
    ? await getProviderPricingCredits({
        providerId: provider._id,
        duration: effectiveDuration,
      })
    : null;

  const base = providerModelCredits ?? providerPricingCredits ?? null;
  const finalCredits = base === null ? null : Math.ceil(base * multiplier);

  return {
    templateOverride: null,
    providerModelCredits,
    providerPricingCredits,
    multiplier,
    finalCredits,
  };
};

const getPricingSummary = async () => {
  const [providers, models, pricing] = await Promise.all([
    ProviderModel.find({ enabled: true })
      .select({
        _id: 1,
        name: 1,
        slug: 1,
        enabled: 1,
        priority: 1,
        metadata: 1,
      })
      .sort({ priority: 1, createdAt: -1 })
      .lean(),
    ProviderModelModel.find({ enabled: true })
      .select({
        _id: 1,
        provider: 1,
        name: 1,
        slug: 1,
        credits: 1,
        estimatedTime: 1,
        enabled: 1,
        priority: 1,
      })
      .sort({ priority: 1, createdAt: -1 })
      .lean(),
    ProviderPricingModel.find({ enabled: true })
      .select({
        _id: 1,
        provider: 1,
        quality: 1,
        duration: 1,
        credits: 1,
        enabled: 1,
      })
      .sort({ provider: 1, duration: 1, credits: 1 })
      .lean(),
  ]);

  return {
    providers: providers.map((p) => ({
      id: p._id,
      name: p.name,
      slug: p.slug,
      priority: p.priority,
      creditsMultiplier: extractMultiplier(p),
    })),
    models: models.map((m) => ({
      id: m._id,
      provider: m.provider,
      name: m.name,
      slug: m.slug,
      credits: m.credits,
      estimatedTime: m.estimatedTime,
      priority: m.priority,
    })),
    pricing: pricing.map((p) => ({
      id: p._id,
      provider: p.provider,
      quality: p.quality,
      duration: p.duration,
      credits: p.credits,
    })),
  };
};

const getPublicPricingSummary = async () => {
  const data = await getPricingSummary();
  const providerIdToSlug = new Map(
    data.providers.map((p) => [String(p.id), p.slug]),
  );

  return {
    providers: data.providers.map((p) => ({
      name: p.name,
      slug: p.slug,
      priority: p.priority,
    })),
    models: data.models
      .map((m) => {
        const providerSlug = providerIdToSlug.get(String(m.provider));
        if (!providerSlug) {
          return null;
        }
        return {
          providerSlug,
          name: m.name,
          slug: m.slug,
          enabled: true,
          estimatedTimeMs: m.estimatedTime ?? null,
          credits: m.credits ?? null,
          priority: m.priority,
        };
      })
      .filter(Boolean),
    pricing: data.pricing
      .map((p) => {
        const providerSlug = providerIdToSlug.get(String(p.provider));
        if (!providerSlug) {
          return null;
        }
        return {
          providerSlug,
          quality: p.quality,
          duration: p.duration,
          credits: p.credits,
        };
      })
      .filter(Boolean),
  };
};

const providerPricingService = Object.freeze({
  resolveCredits,
  getPricingSummary,
  getPublicPricingSummary,
});

export default providerPricingService;
