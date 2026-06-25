/**
 * Notification model.
 * Purpose: stores in-app notification records and delivery scheduling data.
 * Relationships: belongs to a user.
 * Future usage: supports inbox UIs, read state, delayed delivery, broadcast
 * fanout, and external notification provider orchestration.
 */
import mongoose from 'mongoose';
import { createBaseSchema } from './base.schema.js';

const { Schema } = mongoose;

const notificationSchema = createBaseSchema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required.'],
    index: true,
  },
  title: {
    type: String,
    required: [true, 'Notification title is required.'],
    trim: true,
    maxlength: 200,
  },
  message: {
    type: String,
    required: [true, 'Notification message is required.'],
    trim: true,
    maxlength: 2000,
  },
  type: {
    type: String,
    enum: ['info', 'success', 'warning', 'error', 'system', 'payment', 'generation', 'promo'],
    default: 'info',
    index: true,
  },
  read: {
    type: Boolean,
    default: false,
    index: true,
  },
  payload: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {},
  },
  scheduledAt: {
    type: Date,
    default: null,
    index: true,
  },
  sentAt: {
    type: Date,
    default: null,
    index: true,
  },
});

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ type: 1, scheduledAt: 1, createdAt: -1 });

const NotificationModel = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

export default NotificationModel;