/**
 * Coupon model.
 * Purpose: stores promotional credit and discount coupon definitions.
 * Relationships: can be referenced by transactions, rewards, or payments via
 * external reference fields in other models.
 * Future usage: supports campaigns, limited offers, referral incentives, and
 * dynamic growth experiments.
 */
import mongoose from "mongoose";
import { createBaseSchema } from "./base.schema.js";

const couponSchema = createBaseSchema({
  code: {
    type: String,
    required: [true, "Coupon code is required."],
    trim: true,
    uppercase: true,
    maxlength: 50,
  },
  title: {
    type: String,
    required: [true, "Coupon title is required."],
    trim: true,
    maxlength: 160,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: null,
  },
  credits: {
    type: Number,
    default: 0,
    min: 0,
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
  },
  type: {
    type: String,
    enum: ["credits", "percentage", "fixed"],
    required: [true, "Coupon type is required."],
    index: true,
  },
  expiry: {
    type: Date,
    default: null,
    index: true,
  },
  usageLimit: {
    type: Number,
    default: 0,
    min: 0,
  },
  perUserLimit: {
    type: Number,
    default: 1,
    min: 0,
  },
  enabled: {
    type: Boolean,
    default: true,
    index: true,
  },
  usageCount: {
    type: Number,
    default: 0,
    min: 0,
  },
});

couponSchema.index(
  { code: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
    name: "uniq_coupon_code_active",
  },
);
couponSchema.index({ enabled: 1, expiry: 1, createdAt: -1 });
couponSchema.index({ type: 1, createdAt: -1 });

const CouponModel =
  mongoose.models.Coupon || mongoose.model("Coupon", couponSchema);

export default CouponModel;
