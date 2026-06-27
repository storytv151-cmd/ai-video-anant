import CouponModel from "../src/models/Coupon.js";
import { isEmpty } from "./seederUtils.js";

const defaultCoupons = [
  {
    code: "WELCOME50",
    title: "Welcome 50%",
    description: "Get 50% discount on your first subscription purchase.",
    type: "percentage",
    discount: 50,
    expiry: new Date("2027-12-31T23:59:59Z"),
    usageLimit: 1000,
    perUserLimit: 1,
    enabled: true,
  },
  {
    code: "NEWUSER100",
    title: "New User 100 Credits",
    description: "Claim 100 free credits as a new user.",
    type: "credits",
    credits: 100,
    expiry: new Date("2027-12-31T23:59:59Z"),
    usageLimit: 5000,
    perUserLimit: 1,
    enabled: true,
  },
  {
    code: "PREMIUM20",
    title: "Premium 20% Off",
    description: "20% off on all Premium subscriptions.",
    type: "percentage",
    discount: 20,
    expiry: new Date("2027-12-31T23:59:59Z"),
    usageLimit: 2000,
    perUserLimit: 2,
    enabled: true,
  },
  {
    code: "TEST100",
    title: "Test Fixed Coupon",
    description: "Flat discount of 100 rupees.",
    type: "fixed",
    discount: 100,
    expiry: new Date("2027-12-31T23:59:59Z"),
    usageLimit: 1000,
    perUserLimit: 1,
    enabled: true,
  },
];

const seed = async (reseed = false) => {
  if (reseed) {
    await CouponModel.deleteMany({});
  }

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const defaultCoup of defaultCoupons) {
    const existing = await CouponModel.findOne({ code: defaultCoup.code });
    if (!existing) {
      await CouponModel.create(defaultCoup);
      createdCount++;
    } else {
      let updated = false;
      for (const [key, val] of Object.entries(defaultCoup)) {
        if (isEmpty(existing[key])) {
          existing[key] = val;
          updated = true;
        }
      }
      if (updated) {
        await existing.save();
        updatedCount++;
      } else {
        skippedCount++;
      }
    }
  }

  return {
    status:
      createdCount > 0 ? "created" : updatedCount > 0 ? "updated" : "skipped",
    created: createdCount,
    updated: updatedCount,
    skipped: skippedCount,
  };
};

export default { seed };
