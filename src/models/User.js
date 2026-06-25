/**
 * User model.
 * Purpose: stores account identity, profile information, access role, and
 * platform-level account metadata for every registered user.
 * Relationships: references a wallet and exposes virtual relations to devices,
 * refresh tokens, notifications, payments, rewards, and generation jobs.
 * Future usage: supports profile management, account status workflows,
 * subscription lifecycle, analytics, and cross-module ownership queries.
 */
import mongoose from 'mongoose';
import validator from 'validator';
import { createBaseSchema } from './base.schema.js';

const { Schema } = mongoose;

const subscriptionSchema = new Schema(
  {
    plan: {
      type: String,
      trim: true,
      default: 'free',
      maxlength: 50,
    },
    status: {
      type: String,
      enum: ['inactive', 'trial', 'active', 'past_due', 'cancelled', 'expired', 'paused', 'grace_period', 'on_hold', 'revoked'],
      default: 'inactive',
    },
    startDate: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    renewalAt: {
      type: Date,
      default: null,
    },
    source: {
      type: String,
      trim: true,
      maxlength: 100,
      default: 'system',
    },
    platform: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 50,
      default: null,
    },
    productId: {
      type: String,
      trim: true,
      maxlength: 150,
      default: null,
    },
    basePlanId: {
      type: String,
      trim: true,
      maxlength: 120,
      default: null,
    },
    offerId: {
      type: String,
      trim: true,
      maxlength: 120,
      default: null,
    },
    orderId: {
      type: String,
      trim: true,
      maxlength: 255,
      default: null,
    },
    purchaseTokenHash: {
      type: String,
      trim: true,
      maxlength: 255,
      default: null,
    },
    autoRenew: {
      type: Boolean,
      default: false,
    },
    currentPeriodStartAt: {
      type: Date,
      default: null,
    },
    gracePeriodEndsAt: {
      type: Date,
      default: null,
    },
    pausedAt: {
      type: Date,
      default: null,
    },
    onHoldSince: {
      type: Date,
      default: null,
    },
    lastVerifiedAt: {
      type: Date,
      default: null,
    },
    premiumFeatures: {
      type: [String],
      default: [],
    },
    payment: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false },
);

const userSchema = createBaseSchema({
  googleId: {
    type: String,
    required: [true, 'Google ID is required.'],
    trim: true,
    maxlength: 255,
  },
  name: {
    type: String,
    required: [true, 'Name is required.'],
    trim: true,
    minlength: 2,
    maxlength: 120,
  },
  email: {
    type: String,
    required: [true, 'Email is required.'],
    trim: true,
    lowercase: true,
    maxlength: 255,
    validate: {
      validator: (value) => validator.isEmail(value),
      message: 'A valid email address is required.',
    },
  },
  profileImage: {
    type: String,
    trim: true,
    default: null,
    validate: {
      validator: (value) => !value || validator.isURL(value, { require_protocol: true }),
      message: 'Profile image must be a valid URL.',
    },
  },
  country: {
    type: String,
    trim: true,
    uppercase: true,
    maxlength: 2,
    default: null,
  },
  language: {
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 10,
    default: 'en',
  },
  wallet: {
    type: Schema.Types.ObjectId,
    ref: 'Wallet',
    default: null,
  },
  subscription: {
    type: subscriptionSchema,
    default: () => ({}),
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
    index: true,
  },
  lastLogin: {
    type: Date,
    default: null,
  },
  lastActiveAt: {
    type: Date,
    default: null,
    index: true,
  },
  accountStatus: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'disabled', 'blocked'],
    default: 'active',
    index: true,
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'super-admin', 'support'],
    default: 'user',
    index: true,
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {},
  },
});

userSchema.index(
  { googleId: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
    name: 'uniq_user_google_id_active',
  },
);
userSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
    name: 'uniq_user_email_active',
  },
);
userSchema.index(
  { wallet: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { isDeleted: false, wallet: { $exists: true } },
    name: 'uniq_user_wallet_active',
  },
);
userSchema.index({ accountStatus: 1, role: 1, createdAt: -1 });
userSchema.index({ lastLogin: -1 });
userSchema.index({ isEmailVerified: 1, createdAt: -1 });
userSchema.index({ lastActiveAt: -1 });

userSchema.virtual('walletDocument', {
  ref: 'Wallet',
  localField: '_id',
  foreignField: 'user',
  justOne: true,
});

userSchema.virtual('deviceCount').get(function deviceCountVirtual() {
  if (Array.isArray(this.devices)) {
    return this.devices.length;
  }

  return undefined;
});

userSchema.virtual('devices', {
  ref: 'UserDevice',
  localField: '_id',
  foreignField: 'user',
});

userSchema.virtual('refreshTokens', {
  ref: 'RefreshToken',
  localField: '_id',
  foreignField: 'user',
});

userSchema.virtual('generationJobs', {
  ref: 'VideoGenerationJob',
  localField: '_id',
  foreignField: 'user',
});

userSchema.virtual('payments', {
  ref: 'Payment',
  localField: '_id',
  foreignField: 'user',
});

userSchema.virtual('rewardHistory', {
  ref: 'RewardHistory',
  localField: '_id',
  foreignField: 'user',
});

userSchema.virtual('notifications', {
  ref: 'Notification',
  localField: '_id',
  foreignField: 'user',
});

const UserModel = mongoose.models.User || mongoose.model('User', userSchema);

export default UserModel;
