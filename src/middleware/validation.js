/**
 * Generic validation middleware factory.
 * Future modules can plug in validator functions without changing routing conventions.
 */
import ApiError from '../utils/ApiError.js';
import { REQUEST_SOURCES } from '../utils/constants.js';

const validation = (validatorFn, source = REQUEST_SOURCES.BODY) => async (request, response, next) => {
  if (typeof validatorFn !== 'function') {
    next(
      new ApiError(500, 'Validation middleware requires a validator function.', {
        code: 'VALIDATION_CONFIGURATION_ERROR',
      }),
    );
    return;
  }

  const payload = request[source];
  const result = await validatorFn(payload, request);

  if (!result || result.valid !== false) {
    next();
    return;
  }

  next(
    new ApiError(400, result.message || 'Validation failed.', {
      code: 'VALIDATION_ERROR',
      details: result.errors || [],
    }),
  );
};

export default validation;
