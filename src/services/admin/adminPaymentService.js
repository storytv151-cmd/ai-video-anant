import PaymentModel from '../../models/Payment.js';
import UserModel from '../../models/User.js';
import ApiError from '../../utils/ApiError.js';
import { buildPaymentDetailDto, buildPaymentDto } from '../../utils/payment.dto.js';
import walletService from '../wallet/walletService.js';
import adminAuditService from './adminAuditService.js';
import adminQueryService from './adminQueryService.js';

const listPayments = async ({ query = {} } = {}) => {
  const { page, limit, skip } = adminQueryService.buildPagination({
    page: query.page,
    limit: query.limit,
    maxLimit: 100,
  });
  const filter = {};

  if (query.status) {
    filter.status = String(query.status).trim().toLowerCase();
  }
  if (query.paymentType) {
    filter.paymentType = String(query.paymentType).trim().toLowerCase();
  }
  if (query.verificationStatus) {
    filter.verificationStatus = String(query.verificationStatus).trim().toLowerCase();
  }
  if (query.purchaseState) {
    filter.purchaseState = String(query.purchaseState).trim().toLowerCase();
  }
  if (query.plan) {
    filter.subscriptionPlanCode = String(query.plan).trim().toLowerCase();
  }
  if (query.userId) {
    filter.user = query.userId;
  }

  const createdAt = adminQueryService.buildDateRange({
    from: query.dateFrom || query.from,
    to: query.dateTo || query.to,
  });
  if (createdAt) {
    filter.createdAt = createdAt;
  }

  if (query.search) {
    const searchRegex = adminQueryService.buildRegexSearch(query.search);
    const users = await UserModel.find({
      $or: [{ name: searchRegex }, { email: searchRegex }],
    })
      .select({ _id: 1 })
      .lean();
    filter.$or = [
      { orderId: searchRegex },
      { productId: searchRegex },
      { googlePurchaseId: searchRegex },
      { packageName: searchRegex },
      { user: { $in: users.map((item) => item._id) } },
    ];
  }

  const [items, total] = await Promise.all([
    PaymentModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    PaymentModel.countDocuments(filter),
  ]);

  return adminQueryService.buildPaginatedResponse({
    items: items.map((item) => ({
      ...buildPaymentDto(item),
      userId: item.user || null,
      purchaseTokenPresent: Boolean(item.purchaseToken),
    })),
    page,
    limit,
    total,
  });
};

const getPaymentDetail = async ({ paymentId } = {}) => {
  const payment = await PaymentModel.findById(paymentId).lean();
  if (!payment) {
    throw new ApiError(404, 'Payment not found.', { code: 'PAYMENT_NOT_FOUND' });
  }
  return {
    ...buildPaymentDetailDto(payment),
    userId: payment.user || null,
    purchaseToken: payment.purchaseToken || null,
    purchaseTokenHash: payment.purchaseTokenHash || null,
    verificationPayload: payment.verificationPayload || null,
  };
};

const refundPayment = async ({
  paymentId,
  reason = null,
  adminUserId = null,
  request = null,
} = {}) => {
  const payment = await PaymentModel.findById(paymentId);
  if (!payment) {
    throw new ApiError(404, 'Payment not found.', { code: 'PAYMENT_NOT_FOUND' });
  }
  if (payment.status === 'refunded') {
    return getPaymentDetail({ paymentId });
  }

  if (payment.paymentType === 'credit_purchase' && Number(payment.creditsPurchased || 0) > 0) {
    await walletService.refundCredits({
      userId: payment.user,
      credits: Number(payment.creditsPurchased || 0),
      originalTransactionId: payment.creditTransaction || null,
      description: reason || 'Admin payment refund.',
      idempotencyKey: request?.idempotencyKey || null,
    });
  }

  payment.status = 'refunded';
  payment.refundedAt = new Date();
  payment.verificationMessage = reason || payment.verificationMessage || 'Refunded by admin.';
  payment.processedBy = adminUserId || null;
  await payment.save();

  await adminAuditService.logAdminAction({
    request,
    adminUserId,
    action: 'ADMIN_PAYMENT_REFUNDED',
    targetType: 'Payment',
    targetId: payment._id,
    metadata: {
      userId: payment.user,
      paymentType: payment.paymentType,
      creditsPurchased: payment.creditsPurchased,
      reason,
    },
  });

  return getPaymentDetail({ paymentId: payment._id });
};

const getRevenueSummary = async ({ query = {} } = {}) => {
  const match = {
    status: { $in: ['success', 'refunded'] },
  };
  const createdAt = adminQueryService.buildDateRange({
    from: query.dateFrom || query.from,
    to: query.dateTo || query.to,
  });
  if (createdAt) {
    match.createdAt = createdAt;
  }

  const [summary] = await PaymentModel.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        grossRevenue: {
          $sum: {
            $cond: [{ $eq: ['$status', 'success'] }, '$amount', 0],
          },
        },
        refundedRevenue: {
          $sum: {
            $cond: [{ $eq: ['$status', 'refunded'] }, '$amount', 0],
          },
        },
        paymentCount: { $sum: 1 },
        subscriptionRevenue: {
          $sum: {
            $cond: [{ $eq: ['$paymentType', 'subscription'] }, '$amount', 0],
          },
        },
        creditRevenue: {
          $sum: {
            $cond: [{ $eq: ['$paymentType', 'credit_purchase'] }, '$amount', 0],
          },
        },
      },
    },
  ]);

  return {
    grossRevenue: summary?.grossRevenue || 0,
    refundedRevenue: summary?.refundedRevenue || 0,
    netRevenue: (summary?.grossRevenue || 0) - (summary?.refundedRevenue || 0),
    subscriptionRevenue: summary?.subscriptionRevenue || 0,
    paymentRevenue: summary?.creditRevenue || 0,
    paymentCount: summary?.paymentCount || 0,
  };
};

const adminPaymentService = Object.freeze({
  listPayments,
  getPaymentDetail,
  refundPayment,
  getRevenueSummary,
});

export default adminPaymentService;
