import BaseVideoProvider from './baseProvider.js';
import { createVideoProvider } from './providerFactory.js';
import providerFailoverService from './providerFailoverService.js';
import providerHealthService from './providerHealthService.js';
import providerMetricsService from './providerMetricsService.js';
import providerPricingService from './providerPricingService.js';
import providerRoutingService from './providerRoutingService.js';
import providerSelectionService from './providerSelectionService.js';

const videoProvidersService = Object.freeze({
  baseProvider: BaseVideoProvider,
  factory: createVideoProvider,
  providerHealthService,
  providerRoutingService,
  providerFailoverService,
  providerMetricsService,
  providerPricingService,
  providerSelectionService,
});

export default videoProvidersService;
