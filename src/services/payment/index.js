import googlePurchaseValidator from './googlePurchaseValidator.js';
import googlePlayVerificationService from './googlePlayVerificationService.js';
import paymentArchitectureService from './paymentArchitectureService.js';
import paymentAuditService from './paymentAuditService.js';
import paymentSettingsService from './paymentSettingsService.js';
import purchaseDuplicateProtectionService from './purchaseDuplicateProtectionService.js';
import purchaseHistoryService from './purchaseHistoryService.js';
import purchaseSettlementService from './purchaseSettlementService.js';
import purchaseStateService from './purchaseStateService.js';
import purchaseVerificationService from './purchaseVerificationService.js';
import subscriptionArchitectureService from './subscriptionArchitectureService.js';

const paymentService = Object.freeze({
  paymentArchitectureService,
  googlePurchaseValidator,
  googlePlayVerificationService,
  subscriptionArchitectureService,
  paymentSettingsService,
  purchaseDuplicateProtectionService,
  purchaseHistoryService,
  purchaseSettlementService,
  purchaseStateService,
  purchaseVerificationService,
  paymentAuditService,
});

export default paymentService;

export {
  paymentArchitectureService,
  googlePurchaseValidator,
  googlePlayVerificationService,
  subscriptionArchitectureService,
  paymentSettingsService,
  purchaseDuplicateProtectionService,
  purchaseHistoryService,
  purchaseSettlementService,
  purchaseStateService,
  purchaseVerificationService,
  paymentAuditService,
};
