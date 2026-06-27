/**
 * Payment model.
 * Purpose: stores credit purchase payment attempts and gateway outcomes.
 * Relationships: belongs to a user and wallet.
 * Future usage: supports webhook reconciliation, refunds, audit trails,
 * purchase analytics, and payment-provider integrations.
 */
import mongoose from "mongoose";
import { createBaseSchema } from "./base.schema.js";

const { Schema } = mongoose;

const PURCHASE_STATES = [
  "pending",
  "purchased",
  "acknowledged",
  "consumed",
  "renewed",
  "cancelled",
  "expired",
  "refunded",
  "revoked",
  "paused",
  "grace_period",
  "on_hold",
  "failed",
];

const paymentSchema = createBaseSchema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: [true, "User reference is required."],
    index: true,
  },
  wallet: {
    type: Schema.Types.ObjectId,
    ref: "Wallet",
    required: [true, "Wallet reference is required."],
    index: true,
  },
  gateway: {
    type: String,
    required: [true, "Payment gateway is required."],
    trim: true,
    lowercase: true,
    maxlength: 50,
    index: true,
  },
  platform: {
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 50,
    default: "google_play",
    index: true,
  },
  paymentType: {
    type: String,
    enum: ["credit_purchase", "subscription"],
    default: "credit_purchase",
    index: true,
  },
  productType: {
    type: String,
    enum: ["inapp", "subs"],
    default: "inapp",
    index: true,
  },
  productId: {
    type: String,
    trim: true,
    maxlength: 150,
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
  packageCode: {
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 80,
    default: null,
    index: true,
  },
  subscriptionPlanCode: {
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 80,
    default: null,
    index: true,
  },
  purchaseToken: {
    type: String,
    trim: true,
    maxlength: 2000,
    default: null,
  },
  purchaseTokenHash: {
    type: String,
    trim: true,
    maxlength: 255,
    default: null,
    index: true,
  },
  orderId: {
    type: String,
    trim: true,
    maxlength: 255,
    default: null,
    index: true,
  },
  originalOrderId: {
    type: String,
    trim: true,
    maxlength: 255,
    default: null,
  },
  googlePurchaseId: {
    type: String,
    trim: true,
    maxlength: 255,
    default: null,
    index: true,
  },
  purchaseState: {
    type: String,
    enum: PURCHASE_STATES,
    default: "pending",
    index: true,
  },
  verificationStatus: {
    type: String,
    enum: ["pending", "verified", "rejected", "not_requested", "duplicate"],
    default: "not_requested",
    index: true,
  },
  purchaseStateCode: {
    type: Number,
    default: null,
  },
  acknowledgementStateCode: {
    type: Number,
    default: null,
  },
  consumptionStateCode: {
    type: Number,
    default: null,
  },
  purchaseTime: {
    type: Date,
    default: null,
  },
  verifiedAt: {
    type: Date,
    default: null,
  },
  verificationTimeMs: {
    type: Number,
    default: null,
    min: 0,
  },
  acknowledgedAt: {
    type: Date,
    default: null,
  },
  consumedAt: {
    type: Date,
    default: null,
  },
  expiresAt: {
    type: Date,
    default: null,
  },
  restoredAt: {
    type: Date,
    default: null,
  },
  refundedAt: {
    type: Date,
    default: null,
  },
  revokedAt: {
    type: Date,
    default: null,
  },
  pausedAt: {
    type: Date,
    default: null,
  },
  gracePeriodEndsAt: {
    type: Date,
    default: null,
  },
  onHoldSince: {
    type: Date,
    default: null,
  },
  autoRenew: {
    type: Boolean,
    default: false,
  },
  isAcknowledged: {
    type: Boolean,
    default: false,
  },
  isConsumed: {
    type: Boolean,
    default: false,
  },
  gatewayTransactionId: {
    type: String,
    trim: true,
    maxlength: 255,
    default: null,
  },
  amount: {
    type: Number,
    required: [true, "Payment amount is required."],
    min: 0,
  },
  currency: {
    type: String,
    required: [true, "Currency is required."],
    trim: true,
    uppercase: true,
    minlength: 3,
    maxlength: 10,
  },
  baseAmount: {
    type: Number,
    default: null,
    min: 0,
  },
  taxAmount: {
    type: Number,
    default: null,
    min: 0,
  },
  countryCode: {
    type: String,
    trim: true,
    uppercase: true,
    maxlength: 2,
    default: null,
  },
  quantity: {
    type: Number,
    default: 1,
    min: 1,
  },
  refundableQuantity: {
    type: Number,
    default: null,
    min: 0,
  },
  creditsPurchased: {
    type: Number,
    required: [true, "Purchased credits are required."],
    min: 0,
  },
  status: {
    type: String,
    enum: ["pending", "success", "failed", "refunded", "cancelled"],
    default: "pending",
    index: true,
  },
  verificationAttempts: {
    type: Number,
    default: 0,
    min: 0,
  },
  verificationMessage: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: null,
  },
  verificationPayload: {
    type: Schema.Types.Mixed,
    default: null,
  },
  requestId: {
    type: String,
    trim: true,
    maxlength: 120,
    default: null,
    index: true,
  },
  requestIdempotencyKey: {
    type: String,
    trim: true,
    maxlength: 120,
    default: null,
    index: true,
  },
  ipAddress: {
    type: String,
    trim: true,
    maxlength: 100,
    default: null,
  },
  userAgent: {
    type: String,
    trim: true,
    maxlength: 500,
    default: null,
  },
  clientDeviceId: {
    type: String,
    trim: true,
    maxlength: 255,
    default: null,
  },
  deviceInfo: {
    type: Schema.Types.Mixed,
    default: null,
  },
  creditTransaction: {
    type: Schema.Types.ObjectId,
    ref: "CreditTransaction",
    default: null,
    index: true,
  },
  processedBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    default: null,
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
paymentSchema.index({ user: 1, paymentType: 1, createdAt: -1 });
paymentSchema.index({ wallet: 1, createdAt: -1 });
paymentSchema.index({ gateway: 1, status: 1, createdAt: -1 });
paymentSchema.index({ platform: 1, purchaseState: 1, createdAt: -1 });
paymentSchema.index({ platform: 1, verificationStatus: 1, createdAt: -1 });
paymentSchema.index({ user: 1, requestIdempotencyKey: 1, createdAt: -1 });
paymentSchema.index(
  { gateway: 1, gatewayTransactionId: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: {
      isDeleted: false,
      gatewayTransactionId: { $type: "string" },
    },
    name: "uniq_payment_gateway_transaction_active",
  },
);
paymentSchema.index(
  { platform: 1, purchaseTokenHash: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: {
      isDeleted: false,
      purchaseTokenHash: { $type: "string" },
    },
    name: "uniq_payment_platform_purchase_token_hash_active",
  },
);
paymentSchema.index(
  { platform: 1, orderId: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: {
      isDeleted: false,
      orderId: { $type: "string" },
    },
    name: "uniq_payment_platform_order_id_active",
  },
);
paymentSchema.index(
  { platform: 1, googlePurchaseId: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: {
      isDeleted: false,
      googlePurchaseId: { $type: "string" },
    },
    name: "uniq_payment_platform_google_purchase_id_active",
  },
);

const PaymentModel =
  mongoose.models.Payment || mongoose.model("Payment", paymentSchema);

export default PaymentModel;
