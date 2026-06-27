import ApiError from "../../utils/ApiError.js";
import providerSelectionService from "./providerSelectionService.js";

const selectFailover = async ({
  template = null,
  failedProviderId = null,
  attemptedProviderIds = [],
  strategy = "priority",
  executionContext = {},
} = {}) => {
  const excludedProviderIds = Array.from(
    new Set([
      ...(attemptedProviderIds || []),
      ...(failedProviderId ? [failedProviderId] : []),
    ]),
  );

  try {
    return await providerSelectionService.selectProviderAndModel({
      template,
      strategy,
      excludedProviderIds,
      executionContext,
    });
  } catch (error) {
    throw new ApiError(400, "Failover provider selection failed.", {
      code: "PROVIDER_FAILOVER_FAILED",
      details: error?.details || null,
    });
  }
};

const providerFailoverService = Object.freeze({
  selectFailover,
});

export default providerFailoverService;
