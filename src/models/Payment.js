/**
 * Payment model.
 * Purpose: stores credit purchase payment attempts and gateway outcomes.
 * Relationships: belongs to a user and wallet.
 * Future usage: supports webhook reconciliation, refunds, audit trails,
 * purchase analytics, and payment-provider integrations.
 */
import mongoose from 'mongoose';
import { createBaseSchema } from './base.schema.js';

const { Schema } = mongoose;

const paymentSchema = createBaseSchema({
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
  gateway: {
    type: String,
    required: [true, 'Payment gateway is required.'],
    trim: true,
    lowercase: true,
    maxlength: 50,
    index: true,
  },
  gatewayTransactionId: {
    type: String,
    trim: true,
    maxlength: 255,
    default: null,
  },
  amount: {
    type: Number,
    required: [true, 'Payment amount is required.'],
    min: 0,
  },
  currency: {
    type: String,
    required: [true, 'Currency is required.'],
    trim: true,
    uppercase: true,
    minlength: 3,
    maxlength: 10,
  },
  creditsPurchased: {
    type: Number,
    required: [true, 'Purchased credits are required.'],
    min: 0,
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed', 'refunded', 'cancelled'],
    default: 'pending',
    index: true,
  },
  webhookResponse: {
    type: Schema.Types.Mixed,
    default: null,
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {},
  },
});

paymentSchema.index({ user: 1, status: 1, createdAt: -1 });
paymentSchema.index({ wallet: 1, createdAt: -1 });
paymentSchema.index({ gateway: 1, status: 1, createdAt: -1 });
paymentSchema.index(
  { gateway: 1, gatewayTransactionId: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: {
      isDeleted: false,
      gatewayTransactionId: { $exists: true },
    },
    name: 'uniq_payment_gateway_transaction_active',
  },
);

const PaymentModel = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);

export default PaymentModel;