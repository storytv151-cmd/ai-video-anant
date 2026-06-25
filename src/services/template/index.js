/**
 * Template module services.
 * Provides public template and category browsing functionality.
 */
import categoryService from './categoryService.js';
import templateCacheService from './templateCacheService.js';
import templateProviderService from './templateProviderService.js';
import templateRecommendationService from './templateRecommendationService.js';
import templateSearchService from './templateSearchService.js';
import templateService from './templateService.js';
import templateValidationService from './templateValidationService.js';

export default templateService;

export {
  templateService,
  categoryService,
  templateSearchService,
  templateRecommendationService,
  templateProviderService,
  templateValidationService,
  templateCacheService,
};
