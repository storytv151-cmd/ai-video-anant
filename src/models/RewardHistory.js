/**
 * RewardHistory model.
 * Purpose: records non-purchase credit rewards granted to users.
 * Relationships: belongs to a user and can point to external references such
 * as campaigns, check-ins, or referral events.
 * Future usage: supports reward audits, engagement analytics, and fraud review.
 */
import mongoose from "mongoose";
import { createBaseSchema } from "./base.schema.js";

const { Schema } = mongoose;

const rewardReferenceSchema = new Schema(
  {
    type: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null,
    },
    id: {
      type: Schema.Types.ObjectId,
      default: null,
    },
  },
  { _id: false },
);

const rewardHistorySchema = createBaseSchema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: [true, "User reference is required."],
    index: true,
  },
  rewardType: {
    type: String,
    enum: [
      "daily",
      "welcome",
      "referral",
      "advertisement",
      "festival",
      "campaign",
    ],
    required: [true, "Reward type is required."],
    index: true,
  },
  credits: {
    type: Number,
    required: [true, "Reward credits are required."],
    min: 0,
  },
  source: {
    type: String,
    trim: true,
    maxlength: 150,
    required: [true, "Reward source is required."],
    index: true,
  },
  reference: {
    type: rewardReferenceSchema,
    default: () => ({}),
  },
});

rewardHistorySchema.index({ user: 1, rewardType: 1, createdAt: -1 });
rewardHistorySchema.index({ source: 1, createdAt: -1 });

const RewardHistoryModel =
  mongoose.models.RewardHistory ||
  mongoose.model("RewardHistory", rewardHistorySchema);

export default RewardHistoryModel;
