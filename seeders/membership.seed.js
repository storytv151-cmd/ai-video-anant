import AppSettingModel from "../src/models/AppSetting.js";
import { isEmpty } from "./seederUtils.js";

const defaultPlans = [
  {
    name: "Free",
    code: "free",
    billingCycle: "custom",
    durationDays: 30,
    price: 0,
    currency: "INR",
    enabled: true,
    isDefault: true,
    isPremium: false,
    autoRenew: false,
    premiumFeatures: [],
    featureFlags: {
      highQuality: false,
      fastQueue: false,
    },
    limits: {
      dailyGenerations: 5,
    },
    metadata: {
      displayOrder: 1,
    },
  },
  {
    name: "Premium Monthly",
    code: "premium_monthly",
    billingCycle: "monthly",
    durationDays: 30,
    price: 499,
    currency: "INR",
    enabled: true,
    isDefault: false,
    isPremium: true,
    autoRenew: true,
    premiumFeatures: ["4k_generation", "watermark_removal"],
    featureFlags: {
      highQuality: true,
      fastQueue: true,
    },
    limits: {
      dailyGenerations: 100,
    },
    metadata: {
      displayOrder: 2,
    },
  },
  {
    name: "Premium Yearly",
    code: "premium_yearly",
    billingCycle: "yearly",
    durationDays: 365,
    price: 4999,
    currency: "INR",
    enabled: true,
    isDefault: false,
    isPremium: true,
    autoRenew: true,
    premiumFeatures: ["4k_generation", "watermark_removal"],
    featureFlags: {
      highQuality: true,
      fastQueue: true,
    },
    limits: {
      dailyGenerations: 500,
    },
    metadata: {
      displayOrder: 3,
    },
  },
];

const defaultMembershipSettings = {
  enabled: true,
  freePlanCode: "free",
  gracePeriodDays: 3,
  allowTrials: true,
  allowPlanPause: true,
  featureCatalog: ["4k_generation", "watermark_removal"],
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
    doc.subscriptionPlans = defaultPlans;
    doc.membershipSettings = defaultMembershipSettings;
    await doc.save();
    return {
      status: "created",
      created: defaultPlans.length,
      updated: 0,
      skipped: 0,
    };
  }

  let updated = false;
  let createdCount = 0;

  if (isEmpty(doc.subscriptionPlans)) {
    doc.subscriptionPlans = defaultPlans;
    createdCount = defaultPlans.length;
    updated = true;
  } else {
    const existingCodes = new Set(
      doc.subscriptionPlans.map((plan) => plan.code),
    );
    for (const plan of defaultPlans) {
      if (!existingCodes.has(plan.code)) {
        doc.subscriptionPlans.push(plan);
        createdCount++;
        updated = true;
      }
    }
  }

  if (isEmpty(doc.membershipSettings)) {
    doc.membershipSettings = defaultMembershipSettings;
    updated = true;
  }

  if (updated) {
    await doc.save();
    return {
      status: createdCount > 0 ? "created" : "updated",
      created: createdCount,
      updated: createdCount === 0 ? 1 : 0,
      skipped: 0,
    };
  }

  return {
    status: "skipped",
    created: 0,
    updated: 0,
    skipped: defaultPlans.length,
  };
};

export default { seed };
