/**
 * UserDevice model.
 * Purpose: stores known client devices linked to a user account.
 * Relationships: belongs to a user and is referenced by refresh tokens.
 * Future usage: supports device management, push notifications, session
 * analytics, suspicious device reviews, and platform compatibility controls.
 */
import mongoose from "mongoose";
import { createBaseSchema } from "./base.schema.js";

const { Schema } = mongoose;

const userDeviceSchema = createBaseSchema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: [true, "User reference is required."],
    index: true,
  },
  deviceId: {
    type: String,
    required: [true, "Device ID is required."],
    trim: true,
    maxlength: 255,
  },
  platform: {
    type: String,
    required: [true, "Device platform is required."],
    enum: ["web", "ios", "android", "desktop", "other"],
    index: true,
  },
  appVersion: {
    type: String,
    trim: true,
    maxlength: 50,
    default: null,
  },
  model: {
    type: String,
    trim: true,
    maxlength: 120,
    default: null,
  },
  osVersion: {
    type: String,
    trim: true,
    maxlength: 50,
    default: null,
  },
  lastLogin: {
    type: Date,
    default: null,
  },
  pushToken: {
    type: String,
    trim: true,
    maxlength: 1024,
    default: null,
  },
  active: {
    type: Boolean,
    default: true,
    index: true,
  },
});

userDeviceSchema.index(
  { user: 1, deviceId: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
    name: "uniq_user_device_active",
  },
);
userDeviceSchema.index({ user: 1, active: 1, lastLogin: -1 });
userDeviceSchema.index({ pushToken: 1 }, { sparse: true });

userDeviceSchema.virtual("refreshTokens", {
  ref: "RefreshToken",
  localField: "_id",
  foreignField: "device",
});

const UserDeviceModel =
  mongoose.models.UserDevice || mongoose.model("UserDevice", userDeviceSchema);

export default UserDeviceModel;
