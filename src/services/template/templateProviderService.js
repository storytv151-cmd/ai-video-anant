/**
 * Template provider service.
 * Resolves provider/model mappings and estimates credits using ProviderPricing.
 */
import ProviderPricingModel from "../../models/ProviderPricing.js";

const buildPricingKey = ({ providerId, duration }) =>
  `${String(providerId)}:${Number(duration)}`;

const extractId = (value) => {
  if (!value) {
    return null;
  }
  if (typeof value === "object") {
    return value._id || value.id || null;
  }
  return value;
};

const buildMinCreditsMap = (pricingDocs) => {
  const map = new Map();

  for (const doc of pricingDocs) {
    const key = buildPricingKey({
      providerId: doc.provider,
      duration: doc.duration,
    });
    const current = map.get(key);
    if (current === undefined || doc.credits < current) {
      map.set(key, doc.credits);
    }
  }

  return map;
};

const fetchPricingForTemplates = async ({ templates }) => {
  const providerIds = new Set();
  const durations = new Set();

  for (const template of templates) {
    if (Number.isFinite(template.duration)) {
      durations.add(template.duration);
    }
    for (const providerId of template.supportedProviders || []) {
      const id = extractId(providerId);
      if (id) {
        providerIds.add(String(id));
      }
    }
  }

  if (providerIds.size === 0 || durations.size === 0) {
    return [];
  }

  return ProviderPricingModel.find({
    enabled: true,
    provider: { $in: Array.from(providerIds) },
    duration: { $in: Array.from(durations) },
  })
    .select({ provider: 1, duration: 1, credits: 1 })
    .lean();
};

const resolveCreditsRequired = ({ template, pricingMap }) => {
  if (
    template.creditsOverride !== null &&
    template.creditsOverride !== undefined
  ) {
    return template.creditsOverride;
  }

  let best = null;
  const duration = template.duration;

  for (const providerId of template.supportedProviders || []) {
    const id = extractId(providerId);
    if (!id) {
      continue;
    }
    const key = buildPricingKey({ providerId: id, duration });
    const credits = pricingMap.get(key);
    if (credits === undefined) {
      continue;
    }
    if (best === null || credits < best) {
      best = credits;
    }
  }

  return best;
};

const templateProviderService = Object.freeze({
  fetchPricingForTemplates,
  buildMinCreditsMap,
  resolveCreditsRequired,
});

export default templateProviderService;
