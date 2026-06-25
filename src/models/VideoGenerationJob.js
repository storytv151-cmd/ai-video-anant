/**
 * VideoGenerationJob model.
 * Purpose: stores every video generation request and its provider execution
 * lifecycle.
 * Relationships: belongs to a user, wallet, provider, and optionally a
 * template. It also stores provider-facing job references and artifacts.
 * Future usage: supports queues, retries, monitoring, refunds, audit trails,
 * output storage, provider debugging, and cost attribution.
 */
import mongoose from 'mongoose';
import validator from 'validator';
import { createBaseSchema } from './base.schema.js';

const { Schema } = mongoose;

const imageAssetSchema = new Schema(
  {
    url: {
      type: String,
      required: [true, 'Input image URL is required.'],
      trim: true,
      validate: {
        validator: (value) => validator.isURL(value, { require_protocol: true }),
        message: 'Input image URL must be valid.',
      },
    },
    storageKey: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
    mimeType: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null,
    },
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
    sizeInBytes: {
      type: Number,
      min: 0,
      default: null,
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const outputVideoSchema = new Schema(
  {
    url: {
      type: String,
      trim: true,
      default: null,
      validate: {
        validator: (value) => !value || validator.isURL(value, { require_protocol: true }),
        message: 'Output video URL must be valid.',
      },
    },
    thumbnailUrl: {
      type: String,
      trim: true,
      default: null,
      validate: {
        validator: (value) => !value || validator.isURL(value, { require_protocol: true }),
        message: 'Output thumbnail URL must be valid.',
      },
    },
    duration: {
      type: Number,
      min: 0,
      default: null,
    },
    resolution: {
      type: String,
      trim: true,
      maxlength: 50,
      default: null,
    },
    providerAssetId: {
      type: String,
      trim: true,
      maxlength: 255,
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

const logSchema = new Schema(
  {
    level: {
      type: String,
      enum: ['info', 'warn', 'error', 'debug'],
      default: 'info',
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    context: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false },
);

const videoGenerationJobSchema = createBaseSchema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required.'],
    index: true,
  },
  wallet: {
    type: Schema.Types.ObjectId,
    ref: 'Wallet',
    required: [true, 'Wallet reference is required.'],
    index: true,
  },
  provider: {
    type: Schema.Types.ObjectId,
    ref: 'Provider',
    required: [true, 'Provider reference is required.'],
    index: true,
  },
  template: {
    type: Schema.Types.ObjectId,
    ref: 'VideoTemplate',
    default: null,
    index: true,
  },
  generationType: {
    type: String,
    enum: [
      'image_to_video',
      'text_to_video',
      'image_and_prompt',
      'multi_image',
      'video_extend',
      'video_upscale',
    ],
    default: 'image_to_video',
    index: true,
  },
  status: {
    type: String,
    enum: ['pending', 'queued', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'timeout', 'expired'],
    default: 'pending',
    index: true,
  },
  clientRequestKey: {
    type: String,
    trim: true,
    maxlength: 120,
    default: null,
    index: true,
  },
  queuePosition: {
    type: Number,
    default: null,
    min: 0,
    index: true,
  },
  estimatedCompletionTime: {
    type: Date,
    default: null,
  },
  providerProcessingTimeMs: {
    type: Number,
    default: null,
    min: 0,
  },
  actualProcessingTimeMs: {
    type: Number,
    default: null,
    min: 0,
  },
  inputImages: {
    type: [imageAssetSchema],
    default: [],
  },
  outputVideo: {
    type: outputVideoSchema,
    default: () => ({}),
  },
  costInCredits: {
    type: Number,
    default: null,
    min: 0,
  },
  estimatedProviderCostUSD: {
    type: Number,
    default: null,
    min: 0,
  },
  actualProviderCostUSD: {
    type: Number,
    default: null,
    min: 0,
  },
  creditsUsed: {
    type: Number,
    default: 0,
    min: 0,
  },
  externalJobId: {
    type: String,
    trim: true,
    maxlength: 255,
    default: null,
  },
  externalResponse: {
    type: Schema.Types.Mixed,
    default: null,
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  startedAt: {
    type: Date,
    default: null,
  },
  completedAt: {
    type: Date,
    default: null,
  },
  failureReason: {
    type: String,
    trim: true,
    maxlength: 2000,
    default: null,
  },
  refundTransaction: {
    type: Schema.Types.ObjectId,
    ref: 'CreditTransaction',
    default: null,
    index: true,
  },
  lockTransaction: {
    type: Schema.Types.ObjectId,
    ref: 'CreditTransaction',
    default: null,
    index: true,
  },
  consumeTransaction: {
    type: Schema.Types.ObjectId,
    ref: 'CreditTransaction',
    default: null,
    index: true,
  },
  unlockTransaction: {
    type: Schema.Types.ObjectId,
    ref: 'CreditTransaction',
    default: null,
    index: true,
  },
  retryCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  logs: {
    type: [logSchema],
    default: [],
  },
});

videoGenerationJobSchema.index({ user: 1, status: 1, createdAt: -1 });
videoGenerationJobSchema.index({ user: 1, createdAt: -1 });
videoGenerationJobSchema.index({ wallet: 1, createdAt: -1 });
videoGenerationJobSchema.index({ provider: 1, status: 1, createdAt: -1 });
videoGenerationJobSchema.index({ provider: 1, createdAt: -1 });
videoGenerationJobSchema.index({ template: 1, status: 1, createdAt: -1 });
videoGenerationJobSchema.index({ status: 1, progress: 1, createdAt: -1 });
videoGenerationJobSchema.index({ status: 1, queuePosition: 1, createdAt: -1 });
videoGenerationJobSchema.index({ queuePosition: 1, createdAt: -1 });
videoGenerationJobSchema.index(
  { user: 1, clientRequestKey: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { isDeleted: false },
    name: 'uniq_generation_job_user_client_request_key_active',
  },
);
videoGenerationJobSchema.index(
  { externalJobId: 1 },
  {
    sparse: true,
    name: 'idx_generation_job_external_job_id',
  },
);
videoGenerationJobSchema.index({ completedAt: -1 });

const VideoGenerationJobModel =
  mongoose.models.VideoGenerationJob ||
  mongoose.model('VideoGenerationJob', videoGenerationJobSchema);

export default VideoGenerationJobModel;
