/**
 * CreditTransaction model.
 * Purpose: immutable-style ledger entries for every wallet credit movement.
 * Relationships: belongs to a wallet and user, and can reference external
 * resources such as payments, generation jobs, coupons, or admin actions.
 * Future usage: enables reconciliation, auditing, statement generation,
 * refunds, reward tracking, and financial analytics.
 *
 * Status and source:
 * The `status` field allows future async workflows (pending confirmations,
 * retries, cancellations). The `source` field helps classify origin for
 * reporting and fraud analysis.
 */
import mongoose from 'mongoose';
import { createBaseSchema } from './base.schema.js';

const { Schema } = mongoose;

const creditTransactionSchema = createBaseSchema({
  wallet: {
    type: Schema.Types.ObjectId,
    ref: 'Wallet',
    required: [true, 'Wallet reference is required.'],
    index: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required.'],
    index: true,
  },
  type: {
    type: String,
    required: [true, 'Transaction type is required.'],
    enum: [
      'purchase',
      'reward',
      'welcome_bonus',
      'daily_bonus',
      'referral',
      'generation',
      'refund',
      'admin',
      'promo',
      'adjustment',
    ],
    index: true,
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed', 'cancelled'],
    default: 'success',
    index: true,
  },
  source: {
    type: String,
    trim: true,
    maxlength: 100,
    default: 'system',
    index: true,
  },
  purpose: {
    type: String,
    required: [true, 'Transaction purpose is required.'],
    trim: true,
    maxlength: 120,
    index: true,
  },
  credits: {
    type: Number,
    required: [true, 'Transaction credits are required.'],
    min: 0,
  },
  balanceBefore: {
    type: Number,
    required: [true, 'Balance before is required.'],
    min: 0,
  },
  balanceAfter: {
    type: Number,
    required: [true, 'Balance after is required.'],
    min: 0,
  },
  referenceType: {
    type: String,
    trim: true,
    maxlength: 100,
    default: 'system',
    index: true,
  },
  referenceId: {
    type: Schema.Types.ObjectId,
    default: null,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
    default: null,
  },
  idempotencyKey: {
    type: String,
    trim: true,
    maxlength: 120,
    default: null,
    index: true,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
});

creditTransactionSchema.index({ wallet: 1, createdAt: -1 });
creditTransactionSchema.index({ user: 1, createdAt: -1 });
creditTransactionSchema.index({ type: 1, createdAt: -1 });
creditTransactionSchema.index({ status: 1, createdAt: -1 });
creditTransactionSchema.index({ source: 1, createdAt: -1 });
creditTransactionSchema.index({ status: 1, source: 1, createdAt: -1 });
creditTransactionSchema.index({ referenceType: 1, referenceId: 1 });
creditTransactionSchema.index({ purpose: 1, createdAt: -1 });
creditTransactionSchema.index(
  { user: 1, idempotencyKey: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { isDeleted: false },
    name: 'uniq_credit_tx_user_idempotency_active',
  },
);

const CreditTransactionModel =
  mongoose.models.CreditTransaction ||
  mongoose.model('CreditTransaction', creditTransactionSchema);

export default CreditTransactionModel;
