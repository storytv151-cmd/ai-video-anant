import ApiError from '../../utils/ApiError.js';
import providerFailoverService from './providerFailoverService.js';
import providerMetricsService from './providerMetricsService.js';
import providerPricingService from './providerPricingService.js';
import providerSelectionService from './providerSelectionService.js';
import { createVideoProvider } from './providerFactory.js';

const assertDurationLimit = ({ template, provider, model }) => {
  const duration = template?.duration;
  if (!Number.isFinite(duration) || duration <= 0) {
    return;
  }

  const providerMax = provider?.maximumDuration && provider.maximumDuration > 0 ? provider.maximumDuration : null;
  const modelMax = model?.maximumDuration && model.maximumDuration > 0 ? model.maximumDuration : null;
  const maxAllowed = modelMax ?? providerMax;

  if (maxAllowed !== null && duration > maxAllowed) {
    throw new ApiError(400, 'Template duration exceeds provider limit.', { code: 'PROVIDER_DURATION_LIMIT' });
  }
};

const planGeneration = async ({ template, providerSlug = null, providerModelSlug = null, strategy = 'priority' } = {}) => {
  if (!template) {
    throw new ApiError(400, 'Template is required.', { code: 'TEMPLATE_REQUIRED' });
  }

  const { provider, model } = await providerSelectionService.selectProviderAndModel({
    template,
    providerSlug,
    providerModelSlug,
    strategy,
  });

  assertDurationLimit({ template, provider, model });

  const credits = await providerPricingService.resolveCredits({
    template,
    providerSlug: provider.slug,
    providerModelSlug: model?.slug || null,
    duration: template.duration,
  });

  return {
    provider: { id: provider._id, slug: provider.slug, name: provider.name, priority: provider.priority },
    model: model ? { id: model._id, slug: model.slug, name: model.name } : null,
    credits,
  };
};

const startGeneration = async ({
  template,
  providerSlug = null,
  providerModelSlug = null,
  strategy = 'priority',
  allowFailover = true,
} = {}) => {
  const attemptedProviderIds = [];

  const attempt = async ({ pSlug, mSlug }) => {
    const planned = await planGeneration({ template, providerSlug: pSlug, providerModelSlug: mSlug, strategy });
    attemptedProviderIds.push(planned.provider.id);

    const provider = await createVideoProvider({ providerSlug: planned.provider.slug });
    const startedAt = Date.now();
    try {
      const result = await provider.startGeneration({ template, providerModelSlug: planned.model?.slug || null });
      const rt = Date.now() - startedAt;
      await providerMetricsService.recordProviderRequest({ providerId: planned.provider.id, responseTimeMs: rt, success: true });
      return { plan: planned, result };
    } catch (error) {
      const rt = Date.now() - startedAt;
      await providerMetricsService.recordProviderRequest({ providerId: planned.provider.id, responseTimeMs: rt, success: false });
      throw error;
    }
  };

  try {
    return await attempt({ pSlug: providerSlug, mSlug: providerModelSlug });
  } catch (error) {
    if (!allowFailover) {
      throw error;
    }

    const failover = await providerFailoverService.selectFailover({
      template,
      failedProviderId: attemptedProviderIds[attemptedProviderIds.length - 1] || null,
      attemptedProviderIds,
      strategy,
    });

    return attempt({ pSlug: failover.provider.slug, mSlug: failover.model?.slug || null });
  }
};

const providerRoutingService = Object.freeze({
  planGeneration,
  startGeneration,
});

export default providerRoutingService;
