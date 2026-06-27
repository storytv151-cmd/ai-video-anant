/**
 * DailyCheckin model.
 * Purpose: stores streak state and latest reward information for user
 * engagement check-ins.
 * Relationships: belongs to a single user.
 * Future usage: supports streak recovery, gamification, campaigns, and reward
 * automation.
 */
import mongoose from "mongoose";
import { createBaseSchema } from "./base.schema.js";

const { Schema } = mongoose;

const dailyCheckinSchema = createBaseSchema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: [true, "User reference is required."],
    index: true,
  },
  currentStreak: {
    type: Number,
    default: 0,
    min: 0,
  },
  longestStreak: {
    type: Number,
    default: 0,
    min: 0,
  },
  lastCheckin: {
    type: Date,
    default: null,
    index: true,
  },
  todaysReward: {
    type: Number,
    default: 0,
    min: 0,
  },
});

dailyCheckinSchema.index(
  { user: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
    name: "uniq_daily_checkin_user_active",
  },
);
dailyCheckinSchema.index({ lastCheckin: -1 });

const DailyCheckinModel =
  mongoose.models.DailyCheckin ||
  mongoose.model("DailyCheckin", dailyCheckinSchema);

export default DailyCheckinModel;
