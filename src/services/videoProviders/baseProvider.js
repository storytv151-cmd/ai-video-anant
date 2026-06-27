import ApiError from "../../utils/ApiError.js";

class BaseVideoProvider {
  constructor({ providerSlug }) {
    this.providerSlug = String(providerSlug || "").toLowerCase();
    if (!this.providerSlug) {
      throw new ApiError(500, "Provider slug is required.", {
        code: "PROVIDER_SLUG_REQUIRED",
      });
    }
  }

  async startGeneration() {
    throw new ApiError(501, "Provider method not implemented.", {
      code: "PROVIDER_START_NOT_IMPLEMENTED",
    });
  }

  async checkStatus() {
    throw new ApiError(501, "Provider method not implemented.", {
      code: "PROVIDER_STATUS_NOT_IMPLEMENTED",
    });
  }

  async cancelGeneration() {
    throw new ApiError(501, "Provider method not implemented.", {
      code: "PROVIDER_CANCEL_NOT_IMPLEMENTED",
    });
  }

  async getProviderInfo() {
    throw new ApiError(501, "Provider method not implemented.", {
      code: "PROVIDER_INFO_NOT_IMPLEMENTED",
    });
  }

  async healthCheck() {
    throw new ApiError(501, "Provider method not implemented.", {
      code: "PROVIDER_HEALTH_NOT_IMPLEMENTED",
    });
  }
}

export default BaseVideoProvider;
