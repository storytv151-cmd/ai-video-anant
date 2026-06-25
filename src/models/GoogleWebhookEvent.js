import mongoose from 'mongoose';
import { createBaseSchema } from './base.schema.js';

const { Schema } = mongoose;

const googleWebhookEventSchema = createBaseSchema({
  provider: {
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 50,
    default: 'google_play',
    index: true,
  },
  messageId: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255,
    index: true,
  },
  notificationType: {
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 120,
    default: null,
    index: true,
  },
  packageName: {
    type: String,
    trim: true,
    maxlength: 255,
    default: null,
    index: true,
  },
  purchaseTokenHash: {
    type: String,
    trim: true,
    maxlength: 255,
    default: null,
    index: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  },
  processedAt: {
    type: Date,
    default: null,
  },
  status: {
    type: String,
    enum: ['pending', 'processed', 'failed', 'ignored'],
    default: 'pending',
    index: true,
  },
  payload: {
    type: Schema.Types.Mixed,
    default: null,
  },
  error: {
    type: Schema.Types.Mixed,
    default: null,
  },
});

googleWebhookEventSchema.index(
  { provider: 1, messageId: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
    name: 'uniq_google_webhook_event_provider_message_active',
  },
);

const GoogleWebhookEventModel =
  mongoose.models.GoogleWebhookEvent || mongoose.model('GoogleWebhookEvent', googleWebhookEventSchema);

export default GoogleWebhookEventModel;
