/**
 * ProviderModel model.
 * Purpose: separates AI Providers from the provider-specific AI models/variants.
 * Example: Provider = Runway, ProviderModels = Gen-4 / Gen-4 Turbo / Gen-3.
 * Relationships: belongs to a Provider and can be referenced by templates or
 * generation jobs in future phases.
 * Future usage: enables adding new provider models without schema changes,
 * supports per-model pricing, capability matrices, and dynamic routing.
 */
import mongoose from 'mongoose';
import { createBaseSchema } from './base.schema.js';

const { Schema } = mongoose;

const resolutionSchema = new Schema(
  {
    width: { type: Number, min: 1, default: null },
    height: { type: Number, min: 1, default: null },
    label: { type: String, trim: true, maxlength: 50, default: null },
  },
  { _id: false },
);

const providerModelSchema = createBaseSchema({
  provider: {
    type: Schema.Types.ObjectId,
    ref: 'Provider',
    required: [true, 'Provider reference is required.'],
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Model name is required.'],
    trim: true,
    maxlength: 120,
  },
  slug: {
    type: String,
    required: [true, 'Model slug is required.'],
    trim: true,
    lowercase: true,
    maxlength: 120,
  },
  enabled: {
    type: Boolean,
    default: true,
    index: true,
  },
  priority: {
    type: Number,
    default: 0,
    min: 0,
  },
  credits: {
    type: Number,
    default: 0,
    min: 0,
  },
  estimatedTime: {
    type: Number,
    default: 0,
    min: 0,
  },
  supportsImage: {
    type: Boolean,
    default: true,
  },
  supportsVideo: {
    type: Boolean,
    default: true,
  },
  supportsAudio: {
    type: Boolean,
    default: false,
  },
  supportsMultipleImages: {
    type: Boolean,
    default: false,
  },
  maximumDuration: {
    type: Number,
    default: 0,
    min: 0,
  },
  maximumResolution: {
    type: resolutionSchema,
    default: () => ({}),
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {},
  },
});

providerModelSchema.index(
  { provider: 1, slug: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
    name: 'uniq_provider_model_provider_slug_active',
  },
);
providerModelSchema.index({ provider: 1, enabled: 1, priority: 1 });
providerModelSchema.index({ slug: 1, enabled: 1 });

const ProviderModelModel =
  mongoose.models.ProviderModel || mongoose.model('ProviderModel', providerModelSchema);

export default ProviderModelModel;
