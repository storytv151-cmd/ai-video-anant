/**
 * Root service barrel for future service exports.
 * This keeps higher-level wiring consistent as the codebase grows.
 */
export { default as storageService } from './storage/index.js';
export { default as videoProvidersService } from './videoProviders/index.js';
export { default as paymentService } from './payment/index.js';
export { default as walletService } from './wallet/index.js';
export { default as notificationService } from './notification/index.js';
export { default as authService } from './auth/index.js';
export { default as templateService } from './template/index.js';
export { default as generationService } from './generation/index.js';
export { default as settingsService } from './settings/index.js';
export { default as adminService } from './admin/index.js';
