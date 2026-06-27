import AppSettingModel from "../src/models/AppSetting.js";
import { updateFieldIdempotent } from "./seederUtils.js";

const defaultRewardSettings = {
  welcomeBonus: {
    enabled: true,
    credits: 50,
    expiryDays: 30,
  },
  rewardAds: {
    enabled: true,
    creditsPerView: 10,
    dailyLimit: 10,
    cooldownSeconds: 60,
  },
  dailyCheckin: {
    enabled: true,
    rewards: [5, 10, 15, 20, 25, 30, 50],
    streakResetHours: 24,
  },
  referral: {
    enabled: false,
    referrerCredits: 20,
    refereeCredits: 10,
    maxInvitesPerUser: 50,
  },
};

const seed = async (reseed = false) => {
  let doc = await AppSettingModel.findOne({
    section: "GENERAL",
    key: "global",
  });
  if (!doc) {
    doc = new AppSettingModel({ section: "GENERAL", key: "global" });
  }

  if (reseed) {
    Object.assign(doc, defaultRewardSettings);
    await doc.save();
    return {
      status: "created",
      created: Object.keys(defaultRewardSettings).length,
      updated: 0,
      skipped: 0,
    };
  }

  const updated = updateFieldIdempotent(doc, defaultRewardSettings);
  if (updated) {
    await doc.save();
    return { status: "updated", created: 0, updated: 1, skipped: 0 };
  }

  return {
    status: "skipped",
    created: 0,
    updated: 0,
    skipped: Object.keys(defaultRewardSettings).length,
  };
};

export default { seed };
