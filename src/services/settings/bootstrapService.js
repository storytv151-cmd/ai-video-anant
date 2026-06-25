/**
 * Bootstrap service.
 *
 * Why Bootstrap exists:
 * Mobile clients need a single, authoritative response after login that returns
 * all dynamic configuration and relevant user context. This reduces startup
 * round-trips, keeps business configuration database-driven, and allows future
 * product iteration without app releases.
 *
 * Android startup flow (high-level):
 * - App obtains access token via /auth/google
 * - App calls GET /bootstrap once to fetch dynamic configuration and user summary
 * - App caches response locally and revalidates periodically
 *
 * Performance:
 * - Uses Promise.all for parallel I/O
 * - Uses lean() for optimized read payloads
 *
 * Caching:
 * - Add Redis caching later keyed by (section set + userId or public) and
 *   invalidated on AppSetting/provider changes.
 */
import environment from '../../config/environment.js';
import AppSettingModel from '../../models/AppSetting.js';
import ProviderModel from '../../models/Provider.js';
import ProviderModelModel from '../../models/ProviderModel.js';
import ProviderPricingModel from '../../models/ProviderPricing.js';
import UserModel from '../../models/User.js';
import WalletModel from '../../models/Wallet.js';
import { buildPublicProviderDto } from '../../utils/provider.dto.js';
import { buildUserDto } from '../../utils/user.dto.js';
import { buildWalletDto } from '../../utils/wallet.dto.js';

const normalizeSettingDoc = (doc) => doc || null;

const indexSettings = (docs) => {
  const map = new Map();
  for (const doc of docs) {
    const section = doc.section || 'GENERAL';
    const key = doc.key || 'global';
    map.set(`${section}:${key}`, doc);
  }
  return map;
};

const getSetting = (map, section, key = 'global') => normalizeSettingDoc(map.get(`${section}:${key}`));

const pick = (value, fallback = null) => (value === undefined ? fallback : value);

const buildPublicBootstrap = async () => {
  const settingsDocs = await AppSettingModel.find({}).lean();
  const settingsIndex = indexSettings(settingsDocs);

  const system = getSetting(settingsIndex, 'SYSTEM') || getSetting(settingsIndex, 'GENERAL');
  const features = getSetting(settingsIndex, 'FEATURES') || system;
  const rewards = getSetting(settingsIndex, 'REWARDS') || system;
  const payments = getSetting(settingsIndex, 'PAYMENTS') || system;
  const _providersConfig = getSetting(settingsIndex, 'PROVIDERS') || system;
  const storage = getSetting(settingsIndex, 'STORAGE') || system;
  const limits = getSetting(settingsIndex, 'LIMITS') || system;
  const android = getSetting(settingsIndex, 'ANDROID') || system;
  const ios = getSetting(settingsIndex, 'IOS') || system;
  const api = getSetting(settingsIndex, 'API') || system;
  const notifications = getSetting(settingsIndex, 'NOTIFICATIONS') || system;

  const [providers, providerModels, providerPricing] = await Promise.all([
    ProviderModel.find({ enabled: true })
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
      .sort({ priority: 1 })
      .lean(),
    ProviderModelModel.find({ enabled: true })
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
        maximumDuration: 1,
        maximumResolution: 1,
      })
      .sort({ priority: 1 })
      .lean(),
    ProviderPricingModel.find({ enabled: true })
      .select({ provider: 1, duration: 1, credits: 1 })
      .sort({ provider: 1, duration: 1, credits: 1 })
      .lean(),
  ]);

  const providerIdToSlug = new Map();
  for (const p of providers) {
    providerIdToSlug.set(String(p._id), p.slug);
  }

  const modelsByProviderSlug = new Map();
  for (const m of providerModels) {
    const slug = providerIdToSlug.get(String(m.provider));
    if (!slug) {
      continue;
    }
    if (!modelsByProviderSlug.has(slug)) {
      modelsByProviderSlug.set(slug, []);
    }
    modelsByProviderSlug.get(slug).push(m);
  }

  const pricingByProviderSlug = new Map();
  for (const pr of providerPricing) {
    const slug = providerIdToSlug.get(String(pr.provider));
    if (!slug) {
      continue;
    }
    if (!pricingByProviderSlug.has(slug)) {
      pricingByProviderSlug.set(slug, new Map());
    }
    const duration = Number(pr.duration);
    const credits = Number(pr.credits);
    const durationMap = pricingByProviderSlug.get(slug);
    const current = durationMap.get(duration);
    if (current === undefined || credits < current) {
      durationMap.set(duration, credits);
    }
  }

  const publicProviders = providers.map((p) => {
    const models = modelsByProviderSlug.get(p.slug) || [];
    const pricingMap = pricingByProviderSlug.get(p.slug) || new Map();
    const pricingSummary = Array.from(pricingMap.entries())
      .map(([duration, minCredits]) => ({ duration, minCredits }))
      .sort((a, b) => a.duration - b.duration);
    return buildPublicProviderDto({ provider: p, models, pricingSummary });
  });

  const publicProviderModels = providerModels
    .map((m) => {
      const providerSlug = providerIdToSlug.get(String(m.provider));
      if (!providerSlug) {
        return null;
      }
      return {
        providerSlug,
        name: m.name,
        slug: m.slug,
        enabled: Boolean(m.enabled),
        estimatedTimeMs: m.estimatedTime ?? null,
        credits: m.credits ?? null,
        supports: {
          image: Boolean(m.supportsImage),
          video: Boolean(m.supportsVideo),
          audio: Boolean(m.supportsAudio),
          multipleImages: Boolean(m.supportsMultipleImages),
        },
        limits: {
          maximumDuration: m.maximumDuration ?? null,
          maximumResolution: m.maximumResolution || null,
        },
      };
    })
    .filter(Boolean);

  const publicProviderPricing = [];
  for (const [providerSlug, durationMap] of pricingByProviderSlug.entries()) {
    for (const [duration, minCredits] of durationMap.entries()) {
      publicProviderPricing.push({ providerSlug, duration, minCredits });
    }
  }
  publicProviderPricing.sort((a, b) => (a.providerSlug > b.providerSlug ? 1 : -1) || a.duration - b.duration);

  return {
    application: {
      name: environment.app.name,
      env: environment.app.env,
      version: environment.app.version,
      apiBasePath: environment.app.apiBasePath,
      apiVersion: environment.app.apiVersion,
    },
    versioning: {
      android: {
        appVersion: pick(android?.appVersion),
        minimumVersion: pick(android?.minimumVersion),
        forceUpdate: pick(android?.forceUpdate),
      },
      ios: {
        appVersion: pick(ios?.appVersion),
        minimumVersion: pick(ios?.minimumVersion),
        forceUpdate: pick(ios?.forceUpdate),
      },
    },
    system: {
      maintenanceMode: pick(system?.maintenanceMode),
      maintenanceMessage: pick(system?.maintenanceMessage),
      serverMessage: pick(system?.serverMessage),
      registrationEnabled: pick(system?.registrationEnabled),
      googleLoginEnabled: pick(system?.googleLoginEnabled),
      videoGenerationEnabled: pick(system?.videoGenerationEnabled),
    },
    featureToggles: pick(features?.featureToggles, {}),
    rewards: {
      rewardAds: pick(rewards?.rewardAds, {}),
      welcomeBonus: pick(rewards?.welcomeBonus, {}),
      dailyCheckin: pick(rewards?.dailyCheckin, {}),
      referral: pick(rewards?.referral, {}),
      rewardHistory: pick(rewards?.rewardHistory, {}),
    },
    payments: {
      enabled: pick(payments?.payments?.enabled),
      supportedGateways: pick(payments?.payments?.supportedGateways, []),
      defaultCurrency: pick(payments?.payments?.defaultCurrency),
    },
    coupons: {
      enabled: pick(payments?.coupons?.enabled),
      allowStacking: pick(payments?.coupons?.allowStacking),
      maxCouponsPerOrder: pick(payments?.coupons?.maxCouponsPerOrder),
    },
    dynamicBanner: pick(system?.dynamicBanner, {}),
    storage: {
      settings: pick(storage?.storageSettings, {}),
    },
    support: {
      email: pick(system?.supportEmail),
      whatsapp: pick(system?.supportWhatsApp),
      privacyPolicyUrl: pick(system?.privacyPolicyUrl),
      termsUrl: pick(system?.termsUrl),
    },
    limits: {
      apiLimits: pick(api?.apiLimits, pick(limits?.apiLimits, {})),
      rateLimits: pick(api?.rateLimits, pick(limits?.rateLimits, {})),
      uploadLimits: pick(limits?.uploadLimits, {}),
    },
    creditPackages: pick(payments?.creditPackages, pick(system?.creditPackages, [])),
    providers: {
      list: publicProviders,
      models: publicProviderModels,
      pricing: publicProviderPricing,
    },
    notifications: {
      settings: pick(notifications?.notifications, pick(notifications?.metadata, {})),
    },
    serverTime: {
      iso: new Date().toISOString(),
      timezone: environment.scheduling.timezone,
    },
  };
};

const buildUserBootstrap = async ({ userId }) => {
  const [user, wallet] = await Promise.all([
    UserModel.findById(userId).lean(),
    WalletModel.findOne({ user: userId }).lean(),
  ]);

  if (!user) {
    return { user: null };
  }

  const userDto = buildUserDto(user);
  const walletDto = buildWalletDto(wallet);

  return {
    user: {
      profile: {
        id: userDto.id,
        name: userDto.name,
        email: userDto.email,
        profileImage: userDto.profileImage,
        country: userDto.country,
        language: userDto.language,
        role: userDto.role,
        subscription: userDto.subscription,
        isEmailVerified: userDto.isEmailVerified,
      },
      wallet: walletDto
        ? {
            id: walletDto.id,
            currentCredits: walletDto.currentCredits,
            pendingCredits: walletDto.pendingCredits,
            lockedCredits: walletDto.lockedCredits,
            lifetimeCredits: walletDto.lifetimeCredits,
            status: walletDto.status,
          }
        : null,
      subscription: userDto.subscription || null,
    },
  };
};

const bootstrapService = Object.freeze({
  getBootstrap: async ({ userId = null } = {}) => {
    const publicPayload = await buildPublicBootstrap();

    if (!userId) {
      return publicPayload;
    }

    const userPayload = await buildUserBootstrap({ userId });
    return { ...publicPayload, ...userPayload };
  },
});

export default bootstrapService;
