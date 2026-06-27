import AppSettingModel from "../src/models/AppSetting.js";
import { updateFieldIdempotent } from "./seederUtils.js";

const defaultSettings = {
  maintenanceMode: false,
  registrationEnabled: true,
  googleLoginEnabled: true,
  videoGenerationEnabled: true,
  mediaGenerationEnabled: true,
  rewardAds: {
    enabled: true,
    creditsPerView: 10,
    dailyLimit: 10,
    cooldownSeconds: 60,
  },
  welcomeBonus: {
    enabled: true,
    credits: 50,
    expiryDays: 30,
  },
  dailyCheckin: {
    enabled: true,
    rewards: [5, 10, 15, 20, 25, 30, 50],
    streakResetHours: 24,
  },
  payments: {
    enabled: true,
    supportedGateways: ["google-play"],
    defaultCurrency: "INR",
    minimumAmount: 10,
    taxPercentage: 18,
  },
  coupons: {
    enabled: true,
    allowStacking: false,
    maxCouponsPerOrder: 1,
  },
  forceUpdate: false,
  storageSettings: {
    driver: "digitalocean-spaces",
    bucket: null,
    region: null,
    endpoint: null,
    cdnBaseUrl: null,
    signedUrlExpirySeconds: 3600,
  },
  apiLimits: {
    defaultTimeoutMs: 60000,
    maxBatchSize: 5,
    maxConcurrentJobs: 3,
  },
  uploadLimits: {
    maxImageSizeMB: 10,
    maxVideoSizeMB: 100,
    maxAudioSizeMB: 25,
    maxImageCount: 10,
    maxVideoCount: 5,
    maxAudioCount: 5,
    maxOutputCount: 10,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    allowedVideoMimeTypes: ["video/mp4", "video/webm"],
    allowedAudioMimeTypes: ["audio/mpeg", "audio/wav"],
  },
  rateLimits: {
    windowMs: 900000,
    maxRequests: 100,
    authMaxRequests: 25,
    generationMaxRequests: 10,
    uploadMaxRequests: 20,
  },
};

const seed = async (reseed = false) => {
  if (reseed) {
    await AppSettingModel.deleteOne({ section: "GENERAL", key: "global" });
  }

  let existing = await AppSettingModel.findOne({
    section: "GENERAL",
    key: "global",
  });
  if (!existing) {
    await AppSettingModel.create({
      section: "GENERAL",
      key: "global",
      ...defaultSettings,
    });
    return { status: "created", created: 1, updated: 0, skipped: 0 };
  }

  const updated = updateFieldIdempotent(existing, defaultSettings);
  if (updated) {
    await existing.save();
    return { status: "updated", created: 0, updated: 1, skipped: 0 };
  }

  return { status: "skipped", created: 0, updated: 0, skipped: 1 };
};

export default { seed };
