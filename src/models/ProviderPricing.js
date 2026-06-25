/**
 * ProviderPricing model.
 * Purpose: stores pricing entries per provider capability or quality tier.
 * Relationships: belongs to a provider and can be used by pricing engines or
 * admin dashboards.
 * Future usage: supports dynamic credit costing, plan-based overrides, and
 * provider pricing experiments without code changes.
 */
import mongoose from 'mongoose';
import { createBaseSchema } from './base.schema.js';

const { Schema } = mongoose;

const providerPricingSchema = createBaseSchema({
  provider: {
    type: Schema.Types.ObjectId,
    ref: 'Provider',
    required: [true, 'Provider reference is required.'],
    index: true,
  },
  quality: {
    type: String,
    required: [true, 'Quality identifier is required.'],
    trim: true,
    lowercase: true,
    maxlength: 100,
  },
  duration: {
    type: Number,
    required: [true, 'Duration is required.'],
    min: 1,
  },
  credits: {
    type: Number,
    required: [true, 'Credits value is required.'],
    min: 0,
  },
  currency: {
    type: String,
    trim: true,
    uppercase: true,
    maxlength: 10,
    default: 'CREDITS',
  },
  enabled: {
    type: Boolean,
    default: true,
    index: true,
  },
});

providerPricingSchema.index(
  { provider: 1, quality: 1, duration: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
    name: 'uniq_provider_pricing_active',
  },
);
providerPricingSchema.index({ provider: 1, enabled: 1, createdAt: -1 });
providerPricingSchema.index({ credits: 1 });

const ProviderPricingModel =
  mongoose.models.ProviderPricing || mongoose.model('ProviderPricing', providerPricingSchema);

export default ProviderPricingModel;