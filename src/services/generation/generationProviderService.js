import ApiError from "../../utils/ApiError.js";
import ProviderModel from "../../models/Provider.js";
import VideoTemplateModel from "../../models/VideoTemplate.js";
import providerRoutingService from "../videoProviders/providerRoutingService.js";
import providerSelectionService from "../videoProviders/providerSelectionService.js";

const computeEstimatedTimeMs = ({ provider, model }) => {
  if (model?.estimatedTime && Number(model.estimatedTime) > 0) {
    return Number(model.estimatedTime);
  }
  if (
    provider?.averageResponseTimeMs &&
    Number(provider.averageResponseTimeMs) > 0
  ) {
    return Number(provider.averageResponseTimeMs);
  }
  return null;
};

const resolveTemplateById = async (templateId) => {
  const template = await VideoTemplateModel.findById(templateId).lean();
  if (!template) {
    throw new ApiError(404, "Template not found.", {
      code: "TEMPLATE_NOT_FOUND",
    });
  }
  return template;
};

const planExecution = async ({
  template,
  providerSlug = null,
  providerModelSlug = null,
  strategy = "priority",
  executionContext = {},
} = {}) =>
  providerRoutingService.planGeneration({
    template,
    providerSlug,
    providerModelSlug,
    strategy,
    executionContext,
  });

const startExecution = async ({
  template,
  providerSlug = null,
  providerModelSlug = null,
  strategy = "priority",
  allowFailover = true,
  executionContext = {},
} = {}) =>
  providerRoutingService.startGeneration({
    template,
    providerSlug,
    providerModelSlug,
    strategy,
    allowFailover,
    executionContext,
  });

const getProviderDocById = async (providerId) => {
  const provider = await ProviderModel.findById(providerId).lean();
  if (!provider) {
    throw new ApiError(404, "Provider not found.", {
      code: "PROVIDER_NOT_FOUND",
    });
  }
  return provider;
};

const resolveSelection = async ({
  template,
  providerSlug = null,
  providerModelSlug = null,
  strategy = "priority",
  executionContext = {},
} = {}) =>
  providerSelectionService.selectProviderAndModel({
    template,
    providerSlug,
    providerModelSlug,
    strategy,
    executionContext,
  });

const generationProviderService = Object.freeze({
  computeEstimatedTimeMs,
  resolveTemplateById,
  planExecution,
  startExecution,
  getProviderDocById,
  resolveSelection,
});

export default generationProviderService;
