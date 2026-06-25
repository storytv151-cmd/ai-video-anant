import { formatSuccessResponse } from '../utils/responseFormatter.js';
import paymentArchitectureService from '../services/payment/paymentArchitectureService.js';
import paymentAuditService from '../services/payment/paymentAuditService.js';

const getPackages = async (request, response) => {
  const data = await paymentArchitectureService.listCreditPackages();
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const verifyGooglePurchase = async (request, response) => {
  const data = await paymentArchitectureService.verifyGooglePurchasePlaceholder({
    userId: request.user.id,
    payload: request.body,
  });

  paymentAuditService
    .logGoogleVerifyRequested({
      userId: request.user.id,
      request,
      metadata: {
        productId: request.body?.productId || null,
        paymentType: request.body?.paymentType || null,
        duplicateDetected: Boolean(data?.duplicateProtection?.duplicateDetected),
      },
    })
    .catch(() => null);

  response.status(202).json(formatSuccessResponse({ statusCode: 202, data }));
};

const restorePurchases = async (request, response) => {
  const data = await paymentArchitectureService.restorePurchasesPlaceholder({
    userId: request.user.id,
    payload: request.body,
  });

  paymentAuditService
    .logRestoreRequested({
      userId: request.user.id,
      request,
      metadata: {
        requestedProductIds: Array.isArray(request.body?.productIds) ? request.body.productIds.length : 0,
        requestedOrderIds: Array.isArray(request.body?.orderIds) ? request.body.orderIds.length : 0,
      },
    })
    .catch(() => null);

  response.status(202).json(formatSuccessResponse({ statusCode: 202, data }));
};

const getPaymentHistory = async (request, response) => {
  const data = await paymentArchitectureService.listPaymentHistory({
    userId: request.user.id,
    query: request.query,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

export { getPackages, verifyGooglePurchase, restorePurchases, getPaymentHistory };
