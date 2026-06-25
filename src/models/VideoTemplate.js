/**
 * VideoTemplate model.
 * Purpose: stores reusable prompt-driven template definitions for video
 * generation workflows.
 * Relationships: belongs to a category, can reference supported providers,
 * and is linked to generation jobs.
 * Future usage: supports template discovery, premium content, provider
 * compatibility, curated experiences, and pricing overrides.
 */
import mongoose from 'mongoose';
import validator from 'validator';
import { createBaseSchema } from './base.schema.js';

const { Schema } = mongoose;

const metadataUrlValidator = (value) => !value || validator.isURL(value, { require_protocol: true });

const videoTemplateSchema = createBaseSchema({
  category: {
    type: Schema.Types.ObjectId,
    ref: 'TemplateCategory',
    required: [true, 'Template category reference is required.'],
    index: true,
  },
  title: {
    type: String,
    required: [true, 'Template title is required.'],
    trim: true,
    maxlength: 160,
  },
  slug: {
    type: String,
    required: [true, 'Template slug is required.'],
    trim: true,
    lowercase: true,
    maxlength: 180,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: null,
  },
  previewImage: {
    type: String,
    trim: true,
    default: null,
    validate: {
      validator: metadataUrlValidator,
      message: 'Preview image must be a valid URL.',
    },
  },
  previewVideo: {
    type: String,
    trim: true,
    default: null,
    validate: {
      validator: metadataUrlValidator,
      message: 'Preview video must be a valid URL.',
    },
  },
  thumbnail: {
    type: String,
    trim: true,
    default: null,
    validate: {
      validator: metadataUrlValidator,
      message: 'Thumbnail must be a valid URL.',
    },
  },
  prompt: {
    type: String,
    required: [true, 'Template prompt is required.'],
    trim: true,
    maxlength: 10000,
  },
  negativePrompt: {
    type: String,
    trim: true,
    maxlength: 5000,
    default: null,
  },
  supportedProviders: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Provider',
    },
  ],
  requiredImages: {
    type: Number,
    default: 1,
    min: 0,
    max: 20,
  },
  aspectRatio: {
    type: String,
    trim: true,
    maxlength: 20,
    default: '16:9',
    index: true,
  },
  duration: {
    type: Number,
    required: [true, 'Template duration is required.'],
    min: 1,
  },
  tags: [
    {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 50,
    },
  ],
  trending: {
    type: Boolean,
    default: false,
    index: true,
  },
  premium: {
    type: Boolean,
    default: false,
    index: true,
  },
  creditsOverride: {
    type: Number,
    default: null,
    min: 0,
  },
  sortOrder: {
    type: Number,
    default: 0,
    min: 0,
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'inactive', 'archived'],
    default: 'active',
    index: true,
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {},
  },
});

videoTemplateSchema.index(
  { slug: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
    name: 'uniq_video_template_slug_active',
  },
);
videoTemplateSchema.index({ category: 1, status: 1, sortOrder: 1 });
videoTemplateSchema.index({ supportedProviders: 1, status: 1 });
videoTemplateSchema.index({ tags: 1 });
videoTemplateSchema.index({ trending: 1, premium: 1, createdAt: -1 });

videoTemplateSchema.virtual('generationJobs', {
  ref: 'VideoGenerationJob',
  localField: '_id',
  foreignField: 'template',
});

const VideoTemplateModel =
  mongoose.models.VideoTemplate || mongoose.model('VideoTemplate', videoTemplateSchema);

export default VideoTemplateModel;