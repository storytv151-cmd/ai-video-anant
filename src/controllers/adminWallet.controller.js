import { formatSuccessResponse } from '../utils/responseFormatter.js';
import adminWalletService from '../services/admin/adminWalletService.js';

const listAdminWallets = async (request, response) => {
  const data = await adminWalletService.listWallets({ query: request.query });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const getAdminWallet = async (request, response) => {
  const data = await adminWalletService.getWallet({ userId: request.params.userId });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const getAdminWalletHistory = async (request, response) => {
  const data = await adminWalletService.getWalletHistory({
    userId: request.params.userId,
    query: request.query,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const searchAdminWalletTransactions = async (request, response) => {
  const data = await adminWalletService.searchTransactions({ query: request.query });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const grantAdminWalletCredits = async (request, response) => {
  const data = await adminWalletService.grantCredits({
    userId: request.params.userId,
    credits: request.body.credits,
    description: request.body.description || null,
    adminUserId: request.user.id,
    request,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const deductAdminWalletCredits = async (request, response) => {
  const data = await adminWalletService.deductCredits({
    userId: request.params.userId,
    credits: request.body.credits,
    description: request.body.description || null,
    adminUserId: request.user.id,
    request,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const refundAdminWalletCredits = async (request, response) => {
  const data = await adminWalletService.refundCredits({
    userId: request.params.userId,
    credits: request.body.credits,
    originalTransactionId: request.body.originalTransactionId || null,
    description: request.body.description || null,
    adminUserId: request.user.id,
    request,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const updateAdminWalletStatus = async (request, response) => {
  const data = await adminWalletService.updateWalletStatus({
    userId: request.params.userId,
    status: request.body.status,
    adminUserId: request.user.id,
    request,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

export {
  listAdminWallets,
  getAdminWallet,
  getAdminWalletHistory,
  searchAdminWalletTransactions,
  grantAdminWalletCredits,
  deductAdminWalletCredits,
  refundAdminWalletCredits,
  updateAdminWalletStatus,
};
