/**
 * RefreshToken model.
 * Purpose: persists long-lived login sessions per user and device.
 * Relationships: belongs to a user and optionally references a user device.
 * Future usage: supports token rotation, device revocation, suspicious session
 * detection, and secure logout flows.
 */
import mongoose from 'mongoose';
import { createBaseSchema } from './base.schema.js';

const { Schema } = mongoose;

const refreshTokenSchema = createBaseSchema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required.'],
    index: true,
  },
  token: {
    type: String,
    required: [true, 'Refresh token value is required.'],
    trim: true,
    minlength: 20,
    maxlength: 1024,
  },
  device: {
    type: Schema.Types.ObjectId,
    ref: 'UserDevice',
    default: null,
    index: true,
  },
  ip: {
    type: String,
    trim: true,
    maxlength: 64,
    default: null,
  },
  expiresAt: {
    type: Date,
    required: [true, 'Refresh token expiry is required.'],
    index: true,
  },
  revoked: {
    type: Boolean,
    default: false,
    index: true,
  },
});

refreshTokenSchema.index(
  { token: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
    name: 'uniq_refresh_token_active',
  },
);
refreshTokenSchema.index({ user: 1, revoked: 1, expiresAt: -1 });
refreshTokenSchema.index({ device: 1, expiresAt: -1 });
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'ttl_refresh_token_expiry' });

const RefreshTokenModel =
  mongoose.models.RefreshToken || mongoose.model('RefreshToken', refreshTokenSchema);

export default RefreshTokenModel;