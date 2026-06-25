/**
 * Storage service placeholder for future object storage integrations.
 * Business-specific upload workflows will be implemented in later phases.
 */
import digitalOceanSpaces from './digitalOceanSpaces.js';
import { createStorageProvider } from './storageFactory.js';

const storageService = Object.freeze({
  name: 'storage-service-placeholder',
  status: 'placeholder',
  adapters: {
    digitalOceanSpaces,
  },
  factory: createStorageProvider,
});

export default storageService;
