import featureAccessService from './featureAccessService.js';
import googleRtdnService from './googleRtdnService.js';
import googleSubscriptionVerificationService from './googleSubscriptionVerificationService.js';
import membershipService from './membershipService.js';
import subscriptionFraudService from './subscriptionFraudService.js';
import subscriptionHistoryService from './subscriptionHistoryService.js';
import subscriptionRenewalService from './subscriptionRenewalService.js';
import subscriptionRestoreService from './subscriptionRestoreService.js';
import subscriptionSchedulerService from './subscriptionSchedulerService.js';
import subscriptionService from './subscriptionService.js';
import subscriptionSyncService from './subscriptionSyncService.js';
import subscriptionValidationService from './subscriptionValidationService.js';

const subscriptionModule = Object.freeze({
  subscriptionService,
  membershipService,
  featureAccessService,
  googleSubscriptionVerificationService,
  googleRtdnService,
  subscriptionSyncService,
  subscriptionRenewalService,
  subscriptionRestoreService,
  subscriptionFraudService,
  subscriptionValidationService,
  subscriptionHistoryService,
  subscriptionSchedulerService,
});

export default subscriptionModule;

export {
  subscriptionService,
  membershipService,
  featureAccessService,
  googleSubscriptionVerificationService,
  googleRtdnService,
  subscriptionSyncService,
  subscriptionRenewalService,
  subscriptionRestoreService,
  subscriptionFraudService,
  subscriptionValidationService,
  subscriptionHistoryService,
  subscriptionSchedulerService,
};
