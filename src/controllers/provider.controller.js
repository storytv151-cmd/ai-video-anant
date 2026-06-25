import { formatSuccessResponse } from '../utils/responseFormatter.js';
import providerHealthService from '../services/videoProviders/providerHealthService.js';
import providerPricingService from '../services/videoProviders/providerPricingService.js';
import providerSelectionService from '../services/videoProviders/providerSelectionService.js';

const listProviders = async (request, response) => {
  const data = await providerSelectionService.listProviders({ query: request.query });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const getProviderBySlug = async (request, response) => {
  const data = await providerSelectionService.getProviderDetails(request.params.slug);
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const healthSummary = async (request, response) => {
  const data = await providerHealthService.getPublicHealthSummary();
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const pricingSummary = async (request, response) => {
  const data = await providerPricingService.getPublicPricingSummary();
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

export { listProviders, getProviderBySlug, healthSummary, pricingSummary };
