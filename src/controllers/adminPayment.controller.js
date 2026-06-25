import { formatSuccessResponse } from '../utils/responseFormatter.js';
import adminPaymentService from '../services/admin/adminPaymentService.js';

const listAdminPayments = async (request, response) => {
  const data = await adminPaymentService.listPayments({ query: request.query });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const getAdminPayment = async (request, response) => {
  const data = await adminPaymentService.getPaymentDetail({ paymentId: request.params.paymentId });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const refundAdminPayment = async (request, response) => {
  const data = await adminPaymentService.refundPayment({
    paymentId: request.params.paymentId,
    reason: request.body.reason || null,
    adminUserId: request.user.id,
    request,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const getAdminRevenueSummary = async (request, response) => {
  const data = await adminPaymentService.getRevenueSummary({ query: request.query });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

export {
  listAdminPayments,
  getAdminPayment,
  refundAdminPayment,
  getAdminRevenueSummary,
};
