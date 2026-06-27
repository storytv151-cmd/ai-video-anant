import AppSettingModel from "../src/models/AppSetting.js";
import { isEmpty } from "./seederUtils.js";

const defaultPackages = [
  {
    name: "100 Credits",
    code: "CREDIT_PACK_100",
    credits: 100,
    bonusCredits: 0,
    price: 99,
    currency: "INR",
    enabled: true,
    metadata: {
      displayOrder: 1,
    },
  },
  {
    name: "250 Credits",
    code: "CREDIT_PACK_250",
    credits: 250,
    bonusCredits: 25,
    price: 249,
    currency: "INR",
    enabled: true,
    metadata: {
      displayOrder: 2,
    },
  },
  {
    name: "500 Credits",
    code: "CREDIT_PACK_500",
    credits: 500,
    bonusCredits: 75,
    price: 499,
    currency: "INR",
    enabled: true,
    metadata: {
      displayOrder: 3,
    },
  },
  {
    name: "1000 Credits",
    code: "CREDIT_PACK_1000",
    credits: 1000,
    bonusCredits: 200,
    price: 899,
    currency: "INR",
    enabled: true,
    metadata: {
      displayOrder: 4,
    },
  },
  {
    name: "2500 Credits",
    code: "CREDIT_PACK_2500",
    credits: 2500,
    bonusCredits: 600,
    price: 1999,
    currency: "INR",
    enabled: true,
    metadata: {
      displayOrder: 5,
    },
  },
];

const seed = async (reseed = false) => {
  let doc = await AppSettingModel.findOne({
    section: "GENERAL",
    key: "global",
  });
  if (!doc) {
    doc = new AppSettingModel({ section: "GENERAL", key: "global" });
  }

  if (reseed) {
    doc.creditPackages = defaultPackages;
    await doc.save();
    return {
      status: "created",
      created: defaultPackages.length,
      updated: 0,
      skipped: 0,
    };
  }

  let updated = false;
  let createdCount = 0;

  if (isEmpty(doc.creditPackages)) {
    doc.creditPackages = defaultPackages;
    createdCount = defaultPackages.length;
    updated = true;
  } else {
    const existingCodes = new Set(doc.creditPackages.map((pkg) => pkg.code));
    for (const defaultPkg of defaultPackages) {
      if (!existingCodes.has(defaultPkg.code)) {
        doc.creditPackages.push(defaultPkg);
        createdCount++;
        updated = true;
      }
    }
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
    skipped: defaultPackages.length,
  };
};

export default { seed };
