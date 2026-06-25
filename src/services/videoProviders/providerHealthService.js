import ApiError from '../../utils/ApiError.js';
import ProviderModel from '../../models/Provider.js';

const buildProviderHealthItem = (provider) => ({
  id: provider._id,
  slug: provider.slug,
  name: provider.name,
  enabled: provider.enabled,
  priority: provider.priority,
  healthStatus: provider.healthStatus,
  averageResponseTimeMs: provider.averageResponseTimeMs,
  totalRequests: provider.totalRequests,
  successfulRequests: provider.successfulRequests,
  failedRequests: provider.failedRequests,
  errorCount: provider.errorCount,
  lastSuccessAt: provider.lastSuccessAt,
  lastFailureAt: provider.lastFailureAt,
});

const getProviderBySlug = async (slug) => {
  const provider = await ProviderModel.findOne({ slug: String(slug).toLowerCase() }).lean();
  if (!provider) {
    throw new ApiError(404, 'Provider not found.', { code: 'PROVIDER_NOT_FOUND' });
  }
  return provider;
};

const assertProviderEnabled = (provider) => {
  if (!provider?.enabled) {
    throw new ApiError(400, 'Provider is disabled.', { code: 'PROVIDER_DISABLED' });
  }
};

const assertProviderHealthAllowsUse = (provider) => {
  const status = provider?.healthStatus;
  if (status === 'offline' || status === 'maintenance') {
    throw new ApiError(400, 'Provider is not available.', { code: 'PROVIDER_UNAVAILABLE' });
  }
};

const getHealthSummary = async () => {
  const providers = await ProviderModel.find({ enabled: true })
    .select({
      _id: 1,
      name: 1,
      slug: 1,
      enabled: 1,
      priority: 1,
      healthStatus: 1,
      averageResponseTimeMs: 1,
      totalRequests: 1,
      successfulRequests: 1,
      failedRequests: 1,
      errorCount: 1,
      lastSuccessAt: 1,
      lastFailureAt: 1,
    })
    .sort({ priority: 1, createdAt: -1 })
    .lean();

  const summary = {
    totalEnabled: providers.length,
    healthy: 0,
    warning: 0,
    offline: 0,
    maintenance: 0,
  };

  for (const p of providers) {
    if (p.healthStatus && Object.prototype.hasOwnProperty.call(summary, p.healthStatus)) {
      summary[p.healthStatus] += 1;
    }
  }

  return { summary, items: providers.map(buildProviderHealthItem) };
};

const providerHealthService = Object.freeze({
  getProviderBySlug,
  assertProviderEnabled,
  assertProviderHealthAllowsUse,
  getHealthSummary,
});

export default providerHealthService;
