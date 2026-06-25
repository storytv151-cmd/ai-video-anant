import ApiError from '../../utils/ApiError.js';
import AppSettingModel from '../../models/AppSetting.js';
import ProviderModel from '../../models/Provider.js';
import ProviderModelModel from '../../models/ProviderModel.js';
import VideoGenerationJobModel from '../../models/VideoGenerationJob.js';
import VideoTemplateModel from '../../models/VideoTemplate.js';
import WalletModel from '../../models/Wallet.js';

const indexSettings = (docs) => {
  const map = new Map();
  for (const doc of docs) {
    const section = doc.section || 'GENERAL';
    const key = doc.key || 'global';
    map.set(`${section}:${key}`, doc);
  }
  return map;
};

const getSetting = (map, section, key = 'global') => map.get(`${section}:${key}`) || null;

const pick = (value, fallback = null) => (value === undefined ? fallback : value);

const getGenerationSettings = async () => {
  const docs = await AppSettingModel.find({}).lean();
  const settingsIndex = indexSettings(docs);
  const system = getSetting(settingsIndex, 'SYSTEM') || getSetting(settingsIndex, 'GENERAL');
  const limits = getSetting(settingsIndex, 'LIMITS') || system;
  const storage = getSetting(settingsIndex, 'STORAGE') || system;
  const features = getSetting(settingsIndex, 'FEATURES') || system;

  return {
    maintenanceMode: Boolean(pick(system?.maintenanceMode, false)),
    videoGenerationEnabled: Boolean(pick(system?.videoGenerationEnabled, true)),
    uploadLimits: pick(limits?.uploadLimits, {}),
    apiLimits: pick(limits?.apiLimits, pick(system?.apiLimits, {})),
    storageSettings: pick(storage?.storageSettings, {}),
    featureToggles: pick(features?.featureToggles, {}),
  };
};

const assertGenerationEnabled = (settings) => {
  if (settings.maintenanceMode) {
    throw new ApiError(503, 'Service is under maintenance.', { code: 'MAINTENANCE_MODE' });
  }
  if (!settings.videoGenerationEnabled) {
    throw new ApiError(403, 'Video generation is disabled.', { code: 'VIDEO_GENERATION_DISABLED' });
  }
};

const resolveTemplateBySlug = async (templateSlug) => {
  const slug = String(templateSlug || '').toLowerCase();
  if (!slug) {
    throw new ApiError(400, 'templateSlug is required.', { code: 'TEMPLATE_SLUG_REQUIRED' });
  }

  const now = new Date();
  const template = await VideoTemplateModel.findOne({
    slug,
    status: 'active',
    $and: [
      { $or: [{ publishAt: null }, { publishAt: { $lte: now } }] },
      { $or: [{ expiresAt: null }, { expiresAt: { $gte: now } }] },
    ],
  }).lean();

  if (!template) {
    throw new ApiError(404, 'Template not found.', { code: 'TEMPLATE_NOT_FOUND' });
  }

  return template;
};

const resolveProviderBySlug = async (providerSlug) => {
  if (!providerSlug) {
    return null;
  }
  const provider = await ProviderModel.findOne({ slug: String(providerSlug).toLowerCase() }).lean();
  if (!provider) {
    throw new ApiError(404, 'Provider not found.', { code: 'PROVIDER_NOT_FOUND' });
  }
  if (!provider.enabled) {
    throw new ApiError(400, 'Provider is disabled.', { code: 'PROVIDER_DISABLED' });
  }
  if (provider.healthStatus === 'offline' || provider.healthStatus === 'maintenance') {
    throw new ApiError(400, 'Provider is not available.', { code: 'PROVIDER_UNAVAILABLE' });
  }
  return provider;
};

const resolveProviderModelBySlug = async ({ providerId, providerModelSlug }) => {
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
    throw new ApiError(404, 'Provider model not found.', { code: 'PROVIDER_MODEL_NOT_FOUND' });
  }
  return model;
};

const resolveWallet = async ({ userId }) => {
  const wallet = await WalletModel.findOne({ user: userId }).lean();
  if (!wallet) {
    throw new ApiError(404, 'Wallet not found.', { code: 'WALLET_NOT_FOUND' });
  }
  if (wallet.status !== 'active') {
    throw new ApiError(403, 'Wallet is not active.', { code: 'WALLET_NOT_ACTIVE' });
  }
  return wallet;
};

const assertUserConcurrencyLimits = async ({ userId, maxConcurrentJobs }) => {
  if (!Number.isFinite(maxConcurrentJobs) || maxConcurrentJobs <= 0) {
    return;
  }
  const activeCount = await VideoGenerationJobModel.countDocuments({
    user: userId,
    status: { $in: ['pending', 'queued', 'processing'] },
  });
  if (activeCount >= maxConcurrentJobs) {
    throw new ApiError(429, 'Too many active generation jobs.', { code: 'GENERATION_CONCURRENCY_LIMIT' });
  }
};

const getNumericToggle = (featureToggles, key) => {
  if (!featureToggles) {
    return null;
  }
  const raw = featureToggles.get ? featureToggles.get(key) : featureToggles[key];
  if (raw === undefined || raw === null || raw === '') {
    return null;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
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
});

export default generationValidationService;
