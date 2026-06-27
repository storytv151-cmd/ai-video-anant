import crypto from "node:crypto";
import PaymentModel from "../../models/Payment.js";

const normalizeString = (value) => {
  const normalized = String(value || "").trim();
  return normalized || null;
};

const hashPurchaseToken = (value) => {
  const token = normalizeString(value);
  if (!token) {
    return null;
  }
  return crypto.createHash("sha256").update(token).digest("hex");
};

const buildSettlementIdempotencyKey = ({
  purchaseTokenHash = null,
  orderId = null,
  googlePurchaseId = null,
}) =>
  [
    "payment_google_play",
    purchaseTokenHash || orderId || googlePurchaseId || "unknown",
  ].join(":");

const buildRestoreIdempotencyKey = ({
  purchaseTokenHash = null,
  orderId = null,
  googlePurchaseId = null,
}) =>
  [
    "payment_google_play_restore",
    purchaseTokenHash || orderId || googlePurchaseId || "unknown",
  ].join(":");

const findExistingPayment = async ({
  userId = null,
  purchaseTokenHash = null,
  orderId = null,
  googlePurchaseId = null,
  requestIdempotencyKey = null,
  session = null,
} = {}) => {
  const clauses = [];
  if (purchaseTokenHash) {
    clauses.push({ platform: "google_play", purchaseTokenHash });
  }
  if (orderId) {
    clauses.push({ platform: "google_play", orderId });
  }
  if (googlePurchaseId) {
    clauses.push({ platform: "google_play", googlePurchaseId });
  }
  if (userId && requestIdempotencyKey) {
    clauses.push({ user: userId, requestIdempotencyKey });
  }

  if (clauses.length === 0) {
    return null;
  }

  const query = PaymentModel.findOne({ $or: clauses }).sort({ createdAt: -1 });
  if (session) {
    query.session(session);
  }
  return query;
};

const purchaseDuplicateProtectionService = Object.freeze({
  normalizeString,
  hashPurchaseToken,
  buildSettlementIdempotencyKey,
  buildRestoreIdempotencyKey,
  findExistingPayment,
});

export default purchaseDuplicateProtectionService;
