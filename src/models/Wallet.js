/**
 * Wallet model.
 * Purpose: tracks a user's current credit balance and lifetime credit totals.
 * Relationships: belongs to one user and is referenced by transactions,
 * generation jobs, and payments.
 * Wallet rule: wallet balances must never be modified directly. Every balance
 * change must be performed via a CreditTransaction entry followed by a wallet
 * update and commit at the service layer.
 * Future usage: supports wallet-ledger reconciliation, refunds, admin credit
 * actions, and analytics across the credit economy.
 */
import mongoose from 'mongoose';
import { createBaseSchema } from './base.schema.js';

const { Schema } = mongoose;

const walletSchema = createBaseSchema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Wallet user reference is required.'],
    index: true,
  },
  currentCredits: {
    type: Number,
    default: 0,
    min: 0,
  },
  pendingCredits: {
    type: Number,
    default: 0,
    min: 0,
  },
  lockedCredits: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalPurchased: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalUsed: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalRewarded: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalRefunded: {
    type: Number,
    default: 0,
    min: 0,
  },
  lifetimeCredits: {
    type: Number,
    default: 0,
    min: 0,
  },
  status: {
    type: String,
    enum: ['active', 'frozen', 'suspended', 'closed'],
    default: 'active',
    index: true,
  },
});

walletSchema.index(
  { user: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
    name: 'uniq_wallet_user_active',
  },
);
walletSchema.index({ status: 1, createdAt: -1 });
walletSchema.index({ currentCredits: -1 });
walletSchema.index({ lockedCredits: -1, createdAt: -1 });
walletSchema.index({ pendingCredits: -1, createdAt: -1 });

walletSchema.virtual('transactions', {
  ref: 'CreditTransaction',
  localField: '_id',
  foreignField: 'wallet',
});

walletSchema.virtual('payments', {
  ref: 'Payment',
  localField: '_id',
  foreignField: 'wallet',
});

walletSchema.virtual('generationJobs', {
  ref: 'VideoGenerationJob',
  localField: '_id',
  foreignField: 'wallet',
});

const WalletModel = mongoose.models.Wallet || mongoose.model('Wallet', walletSchema);

export default WalletModel;
