/**
 * Provider model.
 * Purpose: stores AI provider capabilities, operational limits, and runtime
 * priority for orchestration decisions.
 * Relationships: referenced by pricing, templates, and generation jobs.
 * Future usage: supports provider failover, feature compatibility checks,
 * dynamic rollout, usage limits, provider-level costing, and operational
 * health telemetry tracking.
 */
import mongoose from "mongoose";
import { createBaseSchema } from "./base.schema.js";

const { Schema } = mongoose;

const resolutionSchema = new Schema(
  {
    width: {
      type: Number,
      min: 1,
      default: null,
    },
    height: {
      type: Number,
      min: 1,
      default: null,
    },
    label: {
      type: String,
      trim: true,
      maxlength: 50,
      default: null,
    },
  },
  { _id: false },
);

const providerSchema = createBaseSchema({
  name: {
    type: String,
    required: [true, "Provider name is required."],
    trim: true,
    maxlength: 100,
  },
  slug: {
    type: String,
    required: [true, "Provider slug is required."],
    trim: true,
    lowercase: true,
    maxlength: 100,
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
    index: true,
  },
  healthStatus: {
    type: String,
    enum: ["healthy", "warning", "offline", "maintenance"],
    default: "healthy",
    index: true,
  },
  errorCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  lastSuccessAt: {
    type: Date,
    default: null,
  },
  lastFailureAt: {
    type: Date,
    default: null,
  },
  averageResponseTimeMs: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalRequests: {
    type: Number,
    default: 0,
    min: 0,
  },
  successfulRequests: {
    type: Number,
    default: 0,
    min: 0,
  },
  failedRequests: {
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
  supportsMultipleImages: {
    type: Boolean,
    default: false,
  },
  supportsAudio: {
    type: Boolean,
    default: false,
  },
  supportsTextToImage: {
    type: Boolean,
    default: false,
  },
  supportsImageToImage: {
    type: Boolean,
    default: false,
  },
  supportsTextToVideo: {
    type: Boolean,
    default: true,
  },
  supportsImageToVideo: {
    type: Boolean,
    default: true,
  },
  supportsVideoToVideo: {
    type: Boolean,
    default: false,
  },
  supportsImageUpscale: {
    type: Boolean,
    default: true,
  },
  supportsVideoUpscale: {
    type: Boolean,
    default: false,
  },
  supportsImageEditing: {
    type: Boolean,
    default: false,
  },
  supportsVideoEditing: {
    type: Boolean,
    default: false,
  },
  supportsBackgroundRemoval: {
    type: Boolean,
    default: false,
  },
  supportsFaceSwap: {
    type: Boolean,
    default: false,
  },
  supportsAudioGeneration: {
    type: Boolean,
    default: false,
  },
  supportsReferenceImages: {
    type: Boolean,
    default: false,
  },
  supportsNegativePrompt: {
    type: Boolean,
    default: false,
  },
  supportsMaskImage: {
    type: Boolean,
    default: false,
  },
  maximumImages: {
    type: Number,
    default: 1,
    min: 0,
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
  dailyLimit: {
    type: Number,
    default: 0,
    min: 0,
  },
  timeout: {
    type: Number,
    default: 60000,
    min: 1000,
  },
  retryCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  creditsPerGeneration: {
    type: Number,
    default: 0,
    min: 0,
  },
  maximumOutputCount: {
    type: Number,
    default: 1,
    min: 1,
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {},
  },
});

providerSchema.index(
  { slug: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
    name: "uniq_provider_slug_active",
  },
);
providerSchema.index({ enabled: 1, priority: 1 });
providerSchema.index({ enabled: 1, healthStatus: 1, priority: 1 });
providerSchema.index({ name: 1 });
providerSchema.index({ supportsVideo: 1, supportsImage: 1, enabled: 1 });
providerSchema.index({
  supportsTextToImage: 1,
  supportsImageToVideo: 1,
  supportsAudioGeneration: 1,
  enabled: 1,
});
providerSchema.index({ lastSuccessAt: -1 });
providerSchema.index({ lastFailureAt: -1 });

providerSchema.virtual("pricingOptions", {
  ref: "ProviderPricing",
  localField: "_id",
  foreignField: "provider",
});

const ProviderModel =
  mongoose.models.Provider || mongoose.model("Provider", providerSchema);

export default ProviderModel;
