import ApiError from "../../utils/ApiError.js";
import PaymentModel from "../../models/Payment.js";
import { buildPaginationMeta } from "../../utils/pagination.js";
import {
  buildPaymentDetailDto,
  buildPaymentDto,
} from "../../utils/payment.dto.js";
import purchaseStateService from "./purchaseStateService.js";

const parsePositiveInt = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
};

const normalizeSort = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  switch (normalized) {
    case "createdat":
    case "created_at_asc":
    case "oldest":
      return { createdAt: 1 };
    case "amount_desc":
      return { amount: -1, createdAt: -1 };
    case "amount_asc":
      return { amount: 1, createdAt: -1 };
    default:
      return { createdAt: -1 };
  }
};

const buildDateRange = ({ from = null, to = null } = {}) => {
  const createdAt = {};
  if (from) {
    const parsed = new Date(from);
    if (!Number.isNaN(parsed.getTime())) {
      createdAt.$gte = parsed;
    }
  }
  if (to) {
    const parsed = new Date(to);
    if (!Number.isNaN(parsed.getTime())) {
      createdAt.$lte = parsed;
    }
  }
  return Object.keys(createdAt).length > 0 ? createdAt : null;
};

const listPaymentHistory = async ({ userId, query = {} } = {}) => {
  const page = parsePositiveInt(query.page, 1);
  const limit = Math.min(parsePositiveInt(query.limit, 20), 100);
  const skip = (page - 1) * limit;
  const filter = { user: userId };

  if (query.status) {
    filter.status = String(query.status).trim().toLowerCase();
  }
  if (query.paymentType) {
    filter.paymentType = String(query.paymentType).trim().toLowerCase();
  }
  if (query.purchaseState) {
    filter.purchaseState = purchaseStateService.normalizePurchaseState(
      query.purchaseState,
    );
  }
  if (query.productId) {
    filter.productId = String(query.productId).trim();
  }

  const dateRange = buildDateRange({ from: query.from, to: query.to });
  if (dateRange) {
    filter.createdAt = dateRange;
  }

  const [items, total] = await Promise.all([
    PaymentModel.find(filter)
      .sort(normalizeSort(query.sort))
      .skip(skip)
      .limit(limit)
      .lean(),
    PaymentModel.countDocuments(filter),
  ]);

  return {
    items: items.map(buildPaymentDto),
    meta: buildPaginationMeta({ page, limit, total }),
  };
};

const getPaymentDetail = async ({ userId, paymentId } = {}) => {
  const payment = await PaymentModel.findOne({
    _id: paymentId,
    user: userId,
  }).lean();
  if (!payment) {
    throw new ApiError(404, "Payment not found.", {
      code: "PAYMENT_NOT_FOUND",
    });
  }
  return buildPaymentDetailDto(payment);
};

const purchaseHistoryService = Object.freeze({
  listPaymentHistory,
  getPaymentDetail,
});

export default purchaseHistoryService;
