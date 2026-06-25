/**
 * Validation registry placeholder for future domain validators.
 * Modules can export validator functions from this directory without changing middleware contracts.
 */
import authValidator from './auth.validator.js';
import commonValidator from './common.validator.js';
import generationValidator from './generation.validator.js';
import paymentValidator from './payment.validator.js';
import providerValidator from './provider.validator.js';
import templateValidator from './template.validator.js';
import walletValidator from './wallet.validator.js';

const buildValidatorResult = ({ valid = true, message = '', errors = [] } = {}) => ({
  valid,
  message,
  errors,
});

const validators = Object.freeze({
  authValidator,
  commonValidator,
  generationValidator,
  paymentValidator,
  providerValidator,
  templateValidator,
  walletValidator,
});

export { buildValidatorResult, validators };
