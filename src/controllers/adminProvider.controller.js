import { formatSuccessResponse } from "../utils/responseFormatter.js";
import adminProviderService from "../services/admin/adminProviderService.js";

const listAdminProviders = async (request, response) => {
  const data = await adminProviderService.listProviders({
    query: request.query,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const getAdminProvider = async (request, response) => {
  const data = await adminProviderService.getProvider({
    providerId: request.params.providerId,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const updateAdminProvider = async (request, response) => {
  const data = await adminProviderService.updateProvider({
    providerId: request.params.providerId,
    payload: request.body,
    adminUserId: request.user.id,
    request,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const listAdminProviderModels = async (request, response) => {
  const data = await adminProviderService.listProviderModels({
    query: request.query,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const updateAdminProviderModel = async (request, response) => {
  const data = await adminProviderService.updateProviderModel({
    modelId: request.params.modelId,
    payload: request.body,
    adminUserId: request.user.id,
    request,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const listAdminProviderPricing = async (request, response) => {
  const data = await adminProviderService.listPricing({ query: request.query });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const upsertAdminProviderPricing = async (request, response) => {
  const data = await adminProviderService.upsertPricing({
    payload: request.body,
    adminUserId: request.user.id,
    request,
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const getAdminProviderHealth = async (request, response) => {
  const data = await adminProviderService.getHealthSummary();
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const getAdminProviderPricingSummary = async (request, response) => {
  const data = await adminProviderService.getPricingSummary();
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

export {
  listAdminProviders,
  getAdminProvider,
  updateAdminProvider,
  listAdminProviderModels,
  updateAdminProviderModel,
  listAdminProviderPricing,
  upsertAdminProviderPricing,
  getAdminProviderHealth,
  getAdminProviderPricingSummary,
};
