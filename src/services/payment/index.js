import googlePurchaseValidator from './googlePurchaseValidator.js';
import paymentArchitectureService from './paymentArchitectureService.js';
import paymentAuditService from './paymentAuditService.js';
import purchaseStateService from './purchaseStateService.js';
import subscriptionArchitectureService from './subscriptionArchitectureService.js';

const paymentService = Object.freeze({
  paymentArchitectureService,
  googlePurchaseValidator,
  subscriptionArchitectureService,
  purchaseStateService,
  paymentAuditService,
});

export default paymentService;

export {
  paymentArchitectureService,
  googlePurchaseValidator,
  subscriptionArchitectureService,
  purchaseStateService,
  paymentAuditService,
};
