import AppSettingModel from "../src/models/AppSetting.js";
import { isEmpty } from "./seederUtils.js";

const defaultToggles = {
  rewardAds: true,
  referral: false,
  premiumTemplates: true,
  premiumModels: true,
  aiChat: true,
  voiceGeneration: true,
  avatarGeneration: false,
  imageUpscale: true,
  videoUpscale: true,
  backgroundRemoval: true,
  faceSwap: true,
  batchGeneration: false,
};

const seed = async (reseed = false) => {
  let doc = await AppSettingModel.findOne({
    section: "GENERAL",
    key: "global",
  });
  if (!doc) {
    doc = new AppSettingModel({ section: "GENERAL", key: "global" });
  }

  if (reseed || isEmpty(doc.featureToggles)) {
    doc.featureToggles = defaultToggles;
    await doc.save();
    return {
      status: "created",
      created: Object.keys(defaultToggles).length,
      updated: 0,
      skipped: 0,
    };
  }

  let updated = false;
  let updatedCount = 0;
  const current =
    doc.featureToggles instanceof Map
      ? Object.fromEntries(doc.featureToggles.entries())
      : doc.featureToggles || {};

  for (const [key, val] of Object.entries(defaultToggles)) {
    if (isEmpty(current[key])) {
      current[key] = val;
      updatedCount++;
      updated = true;
    }
  }

  if (updated) {
    doc.featureToggles = current;
    await doc.save();
    return { status: "updated", created: 0, updated: updatedCount, skipped: 0 };
  }

  return {
    status: "skipped",
    created: 0,
    updated: 0,
    skipped: Object.keys(defaultToggles).length,
  };
};

export default { seed };
