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
import mongoose from "mongoose";
import validator from "validator";
import { createBaseSchema } from "./base.schema.js";

const { Schema } = mongoose;

const isValidUrlOrEmpty = (value) =>
  !value || validator.isURL(value, { require_protocol: true });

const providerSettingSchema = new Schema(
  {
    provider: {
      type: Schema.Types.ObjectId,
      ref: "Provider",
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
      default: "USD",
    },
    enabled: { type: Boolean, default: true },
    externalId: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null,
    },
    googlePlayProductId: {
      type: String,
      trim: true,
      maxlength: 150,
      default: null,
    },
    productType: {
      type: String,
      enum: ["inapp", "subs"],
      default: "inapp",
    },
    offerToken: {
      type: String,
      trim: true,
      maxlength: 255,
      default: null,
    },
    countries: {
      type: [String],
      default: [],
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false },
);

const subscriptionPlanSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    code: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 80,
      required: true,
    },
    version: {
      type: Number,
      default: 1,
      min: 1,
    },
    googlePlayProductId: {
      type: String,
      trim: true,
      maxlength: 150,
      default: null,
    },
    basePlanId: {
      type: String,
      trim: true,
      maxlength: 120,
      default: null,
    },
    offerId: {
      type: String,
      trim: true,
      maxlength: 120,
      default: null,
    },
    billingCycle: {
      type: String,
      enum: ["monthly", "quarterly", "yearly", "custom"],
      default: "monthly",
    },
    durationDays: { type: Number, default: 30, min: 1 },
    price: { type: Number, default: 0, min: 0 },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 10,
      default: "USD",
    },
    enabled: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
    isPremium: { type: Boolean, default: false },
    autoRenew: { type: Boolean, default: true },
    premiumFeatures: { type: [String], default: [] },
    featureFlags: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
    limits: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
    trialDays: { type: Number, default: 0, min: 0 },
    offerLabel: {
      type: String,
      trim: true,
      maxlength: 120,
      default: null,
    },
    countries: {
      type: [String],
      default: [],
    },
    transitions: {
      allowUpgrade: { type: Boolean, default: true },
      allowDowngrade: { type: Boolean, default: true },
      allowRenew: { type: Boolean, default: true },
      allowPause: { type: Boolean, default: true },
      allowResume: { type: Boolean, default: true },
      allowCancel: { type: Boolean, default: true },
      allowTrial: { type: Boolean, default: false },
      metadata: {
        type: Map,
        of: Schema.Types.Mixed,
        default: {},
      },
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
      enum: ["planned", "testing", "disabled", "enabled"],
      default: "planned",
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false },
);

const adminPermissionSchema = new Schema(
  {
    code: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 150,
      required: true,
    },
    label: { type: String, trim: true, maxlength: 160, default: null },
    description: { type: String, trim: true, maxlength: 1000, default: null },
    group: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 80,
      default: null,
    },
    enabled: { type: Boolean, default: true },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false },
);

const adminRoleSchema = new Schema(
  {
    code: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 120,
      required: true,
    },
    label: { type: String, trim: true, maxlength: 160, required: true },
    description: { type: String, trim: true, maxlength: 1000, default: null },
    enabled: { type: Boolean, default: true },
    isSystem: { type: Boolean, default: false },
    inherits: { type: [String], default: [] },
    permissions: { type: [String], default: [] },
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
      "GENERAL",
      "FEATURES",
      "PAYMENTS",
      "PROVIDERS",
      "STORAGE",
      "SECURITY",
      "REWARDS",
      "LIMITS",
      "ANDROID",
      "IOS",
      "API",
      "NOTIFICATIONS",
      "SYSTEM",
      "ADMIN",
    ],
    default: "GENERAL",
    index: true,
  },
  key: {
    type: String,
    required: [true, "Settings key is required."],
    trim: true,
    lowercase: true,
    maxlength: 100,
    default: "global",
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
    defaultCurrency: {
      type: String,
      trim: true,
      uppercase: true,
      default: "USD",
    },
    minimumAmount: { type: Number, default: 0, min: 0 },
    taxPercentage: { type: Number, default: 0, min: 0 },
    googlePlay: {
      enabled: { type: Boolean, default: false },
      packageName: { type: String, trim: true, default: null },
      appId: { type: String, trim: true, default: null },
      serviceAccountEmail: { type: String, trim: true, default: null },
      linkedPackageName: { type: String, trim: true, default: null },
      allowCreditPurchases: { type: Boolean, default: true },
      allowSubscriptions: { type: Boolean, default: true },
      requireAcknowledgement: { type: Boolean, default: true },
      consumeOneTimePurchases: { type: Boolean, default: true },
      subscriptionVerificationIntervalMinutes: {
        type: Number,
        default: 180,
        min: 1,
      },
      subscriptionSyncEnabled: { type: Boolean, default: true },
      subscriptionSyncOnAppOpen: { type: Boolean, default: true },
      renewalRetryCount: { type: Number, default: 3, min: 0 },
      subscriptionRetryCount: { type: Number, default: 3, min: 0 },
      verificationIntervalMinutes: { type: Number, default: 180, min: 1 },
      enableFraudSignals: { type: Boolean, default: true },
      enableRtdnPreparation: { type: Boolean, default: true },
      rtdnPubSubTopic: { type: String, trim: true, default: null },
      rtdnAudience: { type: String, trim: true, default: null },
      rtdnAuthorizedEmails: { type: [String], default: [] },
      rtdnVerificationToken: { type: String, trim: true, default: null },
      featureMapping: { type: Map, of: Schema.Types.Mixed, default: {} },
      metadata: { type: Map, of: Schema.Types.Mixed, default: {} },
    },
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
  mediaGenerationEnabled: {
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
    maxAudioSizeMB: { type: Number, default: 25, min: 0 },
    maxImageCount: { type: Number, default: 10, min: 0 },
    maxVideoCount: { type: Number, default: 5, min: 0 },
    maxAudioCount: { type: Number, default: 5, min: 0 },
    maxOutputCount: { type: Number, default: 10, min: 1 },
    allowedMimeTypes: { type: [String], default: [] },
    allowedVideoMimeTypes: { type: [String], default: [] },
    allowedAudioMimeTypes: { type: [String], default: [] },
  },
  creditPackages: {
    type: [creditPackageSchema],
    default: [],
  },
  subscriptionPlans: {
    type: [subscriptionPlanSchema],
    default: [],
  },
  membershipSettings: {
    enabled: { type: Boolean, default: true },
    freePlanCode: {
      type: String,
      trim: true,
      lowercase: true,
      default: "free",
    },
    gracePeriodDays: { type: Number, default: 3, min: 0 },
    allowTrials: { type: Boolean, default: false },
    allowPlanPause: { type: Boolean, default: false },
    allowGiftSubscription: { type: Boolean, default: false },
    supportedStatuses: {
      type: [String],
      default: [
        "inactive",
        "active",
        "trial",
        "grace_period",
        "paused",
        "expired",
        "cancelled",
        "on_hold",
        "revoked",
        "pending",
        "renewed",
        "past_due",
      ],
    },
    featureCatalog: {
      type: [String],
      default: [],
    },
    futurePlans: {
      type: [String],
      default: ["creator", "family", "enterprise"],
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
  },
  trialSettings: {
    enabled: { type: Boolean, default: false },
    defaultDays: { type: Number, default: 0, min: 0 },
    eligiblePlans: { type: [String], default: [] },
    metadata: { type: Map, of: Schema.Types.Mixed, default: {} },
  },
  offerSettings: {
    enabled: { type: Boolean, default: false },
    allowIntroOffers: { type: Boolean, default: false },
    allowWinbackOffers: { type: Boolean, default: false },
    metadata: { type: Map, of: Schema.Types.Mixed, default: {} },
  },
  countryPricing: {
    type: [Schema.Types.Mixed],
    default: [],
  },
  futurePricing: {
    type: [Schema.Types.Mixed],
    default: [],
  },
  adminAccess: {
    enabled: { type: Boolean, default: true },
    allowCustomRoles: { type: Boolean, default: true },
    sensitiveActionConfirmationRequired: { type: Boolean, default: false },
    roles: {
      type: [adminRoleSchema],
      default: [],
    },
    permissions: {
      type: [adminPermissionSchema],
      default: [],
    },
    allowedIpRanges: {
      type: [String],
      default: [],
    },
    rateLimit: {
      windowMs: { type: Number, default: 60000, min: 1000 },
      maxRequests: { type: Number, default: 120, min: 1 },
    },
    futureScopes: {
      type: [String],
      default: [
        "multi_admin",
        "organizations",
        "teams",
        "regional_admins",
        "white_label",
        "multi_tenant",
        "support_tickets",
        "internal_notes",
        "approval_workflow",
        "bulk_operations",
        "csv_export",
      ],
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
  },
  featureToggles: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {},
  },
  storageSettings: {
    driver: { type: String, trim: true, default: "digitalocean-spaces" },
    bucket: { type: String, trim: true, default: null },
    region: { type: String, trim: true, default: null },
    endpoint: {
      type: String,
      trim: true,
      default: null,
      validate: {
        validator: isValidUrlOrEmpty,
        message: "Storage endpoint must be a valid URL.",
      },
    },
    cdnBaseUrl: {
      type: String,
      trim: true,
      default: null,
      validate: {
        validator: isValidUrlOrEmpty,
        message: "Storage CDN URL must be a valid URL.",
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
      message: "Support email must be a valid email address.",
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
      message: "Privacy policy URL must be valid.",
    },
  },
  termsUrl: {
    type: String,
    trim: true,
    default: null,
    validate: {
      validator: isValidUrlOrEmpty,
      message: "Terms URL must be valid.",
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
        message: "Dynamic banner image URL must be valid.",
      },
    },
    redirectUrl: {
      type: String,
      trim: true,
      default: null,
      validate: {
        validator: isValidUrlOrEmpty,
        message: "Dynamic banner redirect URL must be valid.",
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
    name: "uniq_app_setting_section_key_active",
  },
);
appSettingSchema.index({ section: 1, createdAt: -1 });
appSettingSchema.index({
  maintenanceMode: 1,
  registrationEnabled: 1,
  videoGenerationEnabled: 1,
  mediaGenerationEnabled: 1,
});
appSettingSchema.index({ createdAt: -1 });

const AppSettingModel =
  mongoose.models.AppSetting || mongoose.model("AppSetting", appSettingSchema);

export default AppSettingModel;
