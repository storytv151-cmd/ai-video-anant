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
  const providersConfig = getSetting(settingsIndex, 'PROVIDERS') || system;
  const storage = getSetting(settingsIndex, 'STORAGE') || system;
  const limits = getSetting(settingsIndex, 'LIMITS') || system;
  const android = getSetting(settingsIndex, 'ANDROID') || system;
  const ios = getSetting(settingsIndex, 'IOS') || system;
  const api = getSetting(settingsIndex, 'API') || system;
  const notifications = getSetting(settingsIndex, 'NOTIFICATIONS') || system;

  const [providers, providerModels, providerPricing] = await Promise.all([
    ProviderModel.find({ enabled: true }).sort({ priority: 1 }).lean(),
    ProviderModelModel.find({ enabled: true }).sort({ priority: 1 }).lean(),
    ProviderPricingModel.find({ enabled: true }).sort({ provider: 1, quality: 1, duration: 1 }).lean(),
  ]);

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
      list: providers,
      models: providerModels,
      pricing: providerPricing,
      providerSettings: pick(providersConfig?.providerSettings, []),
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

  return {
    user: {
      profile: {
        id: user._id,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage,
        country: user.country,
        language: user.language,
        role: user.role,
        subscription: user.subscription,
        isEmailVerified: user.isEmailVerified,
      },
      wallet: wallet
        ? {
            id: wallet._id,
            currentCredits: wallet.currentCredits,
            pendingCredits: wallet.pendingCredits,
            lockedCredits: wallet.lockedCredits,
            lifetimeCredits: wallet.lifetimeCredits,
            status: wallet.status,
          }
        : null,
      subscription: user.subscription || null,
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

