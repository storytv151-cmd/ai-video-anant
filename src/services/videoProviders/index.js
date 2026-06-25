/**
 * Video provider service placeholder for future AI generation integrations.
 * Provider-specific adapters will be added in later phases.
 */
import BaseVideoProvider from './baseProvider.js';
import { createVideoProvider } from './providerFactory.js';

const videoProvidersService = Object.freeze({
  name: 'video-providers-service-placeholder',
  status: 'not-implemented',
  baseProvider: BaseVideoProvider,
  factory: createVideoProvider,
});

export default videoProvidersService;
