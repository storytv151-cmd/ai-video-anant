/**
 * Transaction controller.
 * Thin controller for transaction listing and retrieval.
 */
import { formatSuccessResponse } from '../utils/responseFormatter.js';
import ApiError from '../utils/ApiError.js';
import CreditTransactionModel from '../models/CreditTransaction.js';
import walletHistoryService from '../services/wallet/walletHistoryService.js';

const listTransactions = async (request, response) => {
  if (!request.user?.id) {
    throw new ApiError(401, 'Authentication required.', { code: 'AUTH_REQUIRED' });
  }

  const data = await walletHistoryService.listHistory({
    userId: request.user.id,
    page: request.query.page,
    limit: request.query.limit,
    type: request.query.type,
    status: request.query.status,
    dateFrom: request.query.dateFrom,
    dateTo: request.query.dateTo,
    sort: request.query.sort,
  });

  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const getTransactionById = async (request, response) => {
  if (!request.user?.id) {
    throw new ApiError(401, 'Authentication required.', { code: 'AUTH_REQUIRED' });
  }

  const { id } = request.params;
  const transaction = await CreditTransactionModel.findOne({ _id: id, user: request.user.id }).lean();
  if (!transaction) {
    throw new ApiError(404, 'Transaction not found.', { code: 'TRANSACTION_NOT_FOUND' });
  }

  response.status(200).json(formatSuccessResponse({ statusCode: 200, data: transaction }));
};

export { listTransactions, getTransactionById };

