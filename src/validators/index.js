/**
 * Validation registry placeholder for future domain validators.
 * Modules can export validator functions from this directory without changing middleware contracts.
 */
import authValidator from './auth.validator.js';
import bootstrapValidator from './bootstrap.validator.js';
import categoryValidator from './category.validator.js';
import commonValidator from './common.validator.js';
import generationValidator from './generation.validator.js';
import historyValidator from './history.validator.js';
import paymentValidator from './payment.validator.js';
import providerValidator from './provider.validator.js';
import rewardValidator from './reward.validator.js';
import statusValidator from './status.validator.js';
import subscriptionValidator from './subscription.validator.js';
import templateValidator from './template.validator.js';
import transactionValidator from './transaction.validator.js';
import uploadValidator from './upload.validator.js';
import walletValidator from './wallet.validator.js';

const buildValidatorResult = ({ valid = true, message = '', errors = [] } = {}) => ({
  valid,
  message,
  errors,
});

const validators = Object.freeze({
  authValidator,
  bootstrapValidator,
  categoryValidator,
  commonValidator,
  generationValidator,
  historyValidator,
  paymentValidator,
  providerValidator,
  rewardValidator,
  statusValidator,
  subscriptionValidator,
  templateValidator,
  transactionValidator,
  uploadValidator,
  walletValidator,
});

export { buildValidatorResult, validators };
