/**
 * AppSetting model.
 * Purpose: dynamic application configuration stored in MongoDB so business and
 * operational settings can change without code deployments.
 * Relationships: can reference providers inside provider-level overrides.
 * Future usage: supports feature toggles, monetization controls, provider
 * runtime tuning, maintenance mode, rollout strategies, and environment-aware
 * configuration management.
 *
 * Section-based configuration:
 * Settings are grouped by a `section` to avoid a single giant configuration
 * document. The application can load settings by section and merge at runtime.
 */
import mongoose from 'mongoose';
import validator from 'validator';
import { createBaseSchema } from './base.schema.js';

const { Schema } = mongoose;

const isValidUrlOrEmpty = (value) => !value || validator.isURL(value, { require_protocol: true });

const providerSettingSchema = new Schema(
  {
    provider: {
      type: Schema.Types.ObjectId,
      ref: 'Provider',
      default: null,
    },
    enabled: { type: Boolean, default: true },
    priority: { type: Number, default: 0, min: 0 },
    timeoutMs: { type: Number, default: 60000, min: 1000 },
    retryCount: { type: Number, default: 0, min: 0 },
    dailyLimit: { type: Number, default: 0, min: 0 },
    creditsMultiplier: { type: Number, default: 1, min: 0 },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false },
);

const creditPackageSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    code: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 50,
      default: null,
    },
    credits: { type: Number, required: true, min: 0 },
    bonusCredits: { type: Number, default: 0, min: 0 },
    price: { type: Number, required: true, min: 0 },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 10,
      default: 'USD',
    },
    enabled: { type: Boolean, default: true },
    externalId: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null,
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false },
);

const futureProviderSchema = new Schema(
  {
    name: { type: String, trim: true, maxlength: 100, required: true },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 100,
      required: true,
    },
    status: {
      type: String,
      enum: ['planned', 'testing', 'disabled', 'enabled'],
      default: 'planned',
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false },
);

const appSettingSchema = createBaseSchema({
  section: {
    type: String,
    enum: [
      'GENERAL',
      'FEATURES',
      'PAYMENTS',
      'PROVIDERS',
      'STORAGE',
      'SECURITY',
      'REWARDS',
      'LIMITS',
      'ANDROID',
      'IOS',
      'API',
      'NOTIFICATIONS',
      'SYSTEM',
    ],
    default: 'GENERAL',
    index: true,
  },
  key: {
    type: String,
    required: [true, 'Settings key is required.'],
    trim: true,
    lowercase: true,
    maxlength: 100,
    default: 'global',
  },
  welcomeBonus: {
    enabled: { type: Boolean, default: true },
    credits: { type: Number, default: 0, min: 0 },
    expiryDays: { type: Number, default: 0, min: 0 },
  },
  rewardAds: {
    enabled: { type: Boolean, default: false },
    creditsPerView: { type: Number, default: 0, min: 0 },
    dailyLimit: { type: Number, default: 0, min: 0 },
    cooldownSeconds: { type: Number, default: 0, min: 0 },
  },
  dailyCheckin: {
    enabled: { type: Boolean, default: true },
    rewards: { type: [Number], default: [] },
    streakResetHours: { type: Number, default: 24, min: 1 },
  },
  referral: {
    enabled: { type: Boolean, default: false },
    referrerCredits: { type: Number, default: 0, min: 0 },
    refereeCredits: { type: Number, default: 0, min: 0 },
    maxInvitesPerUser: { type: Number, default: 0, min: 0 },
  },
  payments: {
    enabled: { type: Boolean, default: false },
    supportedGateways: { type: [String], default: [] },
    defaultCurrency: { type: String, trim: true, uppercase: true, default: 'USD' },
    minimumAmount: { type: Number, default: 0, min: 0 },
    taxPercentage: { type: Number, default: 0, min: 0 },
    metadata: { type: Map, of: Schema.Types.Mixed, default: {} },
  },
  coupons: {
    enabled: { type: Boolean, default: true },
    allowStacking: { type: Boolean, default: false },
    maxCouponsPerOrder: { type: Number, default: 1, min: 0 },
  },
  maintenanceMode: {
    type: Boolean,
    default: false,
    index: true,
  },
  registrationEnabled: {
    type: Boolean,
    default: true,
    index: true,
  },
  googleLoginEnabled: { type: Boolean, default: true },
  videoGenerationEnabled: {
    type: Boolean,
    default: true,
    index: true,
  },
  providerSettings: {
    type: [providerSettingSchema],
    default: [],
  },
  uploadLimits: {
    maxImageSizeMB: { type: Number, default: 10, min: 0 },
    maxVideoSizeMB: { type: Number, default: 100, min: 0 },
    maxImageCount: { type: Number, default: 10, min: 0 },
    allowedMimeTypes: { type: [String], default: [] },
  },
  creditPackages: {
    type: [creditPackageSchema],
    default: [],
  },
  featureToggles: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {},
  },
  storageSettings: {
    driver: { type: String, trim: true, default: 'digitalocean-spaces' },
    bucket: { type: String, trim: true, default: null },
    region: { type: String, trim: true, default: null },
    endpoint: {
      type: String,
      trim: true,
      default: null,
      validate: {
        validator: isValidUrlOrEmpty,
        message: 'Storage endpoint must be a valid URL.',
      },
    },
    cdnBaseUrl: {
      type: String,
      trim: true,
      default: null,
      validate: {
        validator: isValidUrlOrEmpty,
        message: 'Storage CDN URL must be a valid URL.',
      },
    },
    signedUrlExpirySeconds: { type: Number, default: 0, min: 0 },
    metadata: { type: Map, of: Schema.Types.Mixed, default: {} },
  },
  apiLimits: {
    defaultTimeoutMs: { type: Number, default: 60000, min: 1000 },
    maxBatchSize: { type: Number, default: 1, min: 1 },
    maxConcurrentJobs: { type: Number, default: 1, min: 1 },
  },
  rateLimits: {
    windowMs: { type: Number, default: 900000, min: 1000 },
    maxRequests: { type: Number, default: 100, min: 1 },
    authMaxRequests: { type: Number, default: 25, min: 1 },
    generationMaxRequests: { type: Number, default: 10, min: 1 },
    uploadMaxRequests: { type: Number, default: 20, min: 1 },
  },
  supportEmail: {
    type: String,
    trim: true,
    lowercase: true,
    default: null,
    validate: {
      validator: (value) => !value || validator.isEmail(value),
      message: 'Support email must be a valid email address.',
    },
  },
  supportWhatsApp: {
    type: String,
    trim: true,
    maxlength: 30,
    default: null,
  },
  privacyPolicyUrl: {
    type: String,
    trim: true,
    default: null,
    validate: {
      validator: isValidUrlOrEmpty,
      message: 'Privacy policy URL must be valid.',
    },
  },
  termsUrl: {
    type: String,
    trim: true,
    default: null,
    validate: {
      validator: isValidUrlOrEmpty,
      message: 'Terms URL must be valid.',
    },
  },
  appVersion: {
    type: String,
    trim: true,
    maxlength: 50,
    default: null,
  },
  minimumVersion: {
    type: String,
    trim: true,
    maxlength: 50,
    default: null,
  },
  forceUpdate: { type: Boolean, default: false },
  serverMessage: {
    type: String,
    trim: true,
    maxlength: 2000,
    default: null,
  },
  dynamicBanner: {
    enabled: { type: Boolean, default: false },
    title: { type: String, trim: true, maxlength: 160, default: null },
    message: { type: String, trim: true, maxlength: 1000, default: null },
    imageUrl: {
      type: String,
      trim: true,
      default: null,
      validate: {
        validator: isValidUrlOrEmpty,
        message: 'Dynamic banner image URL must be valid.',
      },
    },
    redirectUrl: {
      type: String,
      trim: true,
      default: null,
      validate: {
        validator: isValidUrlOrEmpty,
        message: 'Dynamic banner redirect URL must be valid.',
      },
    },
    startAt: { type: Date, default: null },
    endAt: { type: Date, default: null },
  },
  maintenanceMessage: {
    type: String,
    trim: true,
    maxlength: 2000,
    default: null,
  },
  futureAIProviders: {
    type: [futureProviderSchema],
    default: [],
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {},
  },
});

appSettingSchema.index(
  { section: 1, key: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
    name: 'uniq_app_setting_section_key_active',
  },
);
appSettingSchema.index({ section: 1, createdAt: -1 });
appSettingSchema.index({ maintenanceMode: 1, registrationEnabled: 1, videoGenerationEnabled: 1 });
appSettingSchema.index({ createdAt: -1 });

const AppSettingModel = mongoose.models.AppSetting || mongoose.model('AppSetting', appSettingSchema);

export default AppSettingModel;
