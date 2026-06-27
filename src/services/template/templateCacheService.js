/**
 * Template cache service placeholder.
 * This module is the single integration point for future Redis caching.
 * No caching is implemented yet; methods currently behave as no-ops.
 */

const templateCacheService = Object.freeze({
  get: async () => null,
  set: async () => null,
  del: async () => null,
});

export default templateCacheService;
