/**
 * Wallet module services (Wallet & Credit Engine).
 * All credit movements in the system must go through these services.
 */
import creditTransactionService from './creditTransactionService.js';
import rewardService from './rewardService.js';
import walletBootstrapService from './walletBootstrapService.js';
import walletHistoryService from './walletHistoryService.js';
import walletService from './walletService.js';
import walletValidationService from './walletValidationService.js';

export default walletService;

export {
  walletService,
  creditTransactionService,
  rewardService,
  walletValidationService,
  walletHistoryService,
  walletBootstrapService,
};
