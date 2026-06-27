import { formatSuccessResponse } from "../utils/responseFormatter.js";
import providerAdminService from "../services/videoProviders/providerAdminService.js";

const listProvidersAdmin = async (request, response) => {
  const data = await providerAdminService.listProvidersInternal();
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const getProviderAdmin = async (request, response) => {
  const data = await providerAdminService.getProviderInternal(
    request.params.slug,
  );
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const healthAdmin = async (request, response) => {
  const data = await providerAdminService.getHealthInternal();
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const pricingAdmin = async (request, response) => {
  const data = await providerAdminService.getPricingInternal();
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

export { listProvidersAdmin, getProviderAdmin, healthAdmin, pricingAdmin };
