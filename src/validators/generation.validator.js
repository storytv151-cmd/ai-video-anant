const buildResult = ({ valid = true, message = '', errors = [] } = {}) => ({ valid, message, errors });

const validateStart = async (body = {}) => {
  const errors = [];

  if (!body.templateSlug || typeof body.templateSlug !== 'string') {
    errors.push({ field: 'templateSlug', message: 'templateSlug is required.' });
  }

  if (body.providerSlug !== undefined && body.providerSlug !== null && typeof body.providerSlug !== 'string') {
    errors.push({ field: 'providerSlug', message: 'providerSlug must be a string.' });
  }

  if (
    body.providerModelSlug !== undefined &&
    body.providerModelSlug !== null &&
    typeof body.providerModelSlug !== 'string'
  ) {
    errors.push({ field: 'providerModelSlug', message: 'providerModelSlug must be a string.' });
  }

  if (body.strategy !== undefined && body.strategy !== null && typeof body.strategy !== 'string') {
    errors.push({ field: 'strategy', message: 'strategy must be a string.' });
  }

  if (body.inputImages !== undefined && body.inputImages !== null) {
    if (!Array.isArray(body.inputImages)) {
      errors.push({ field: 'inputImages', message: 'inputImages must be an array.' });
    } else {
      for (let i = 0; i < body.inputImages.length; i += 1) {
        const img = body.inputImages[i];
        if (!img || typeof img !== 'object') {
          errors.push({ field: `inputImages[${i}]`, message: 'Each input image must be an object.' });
          continue;
        }
        if (!img.url || typeof img.url !== 'string') {
          errors.push({ field: `inputImages[${i}].url`, message: 'Image url is required.' });
        }
      }
    }
  }

  if (errors.length > 0) {
    return buildResult({ valid: false, message: 'Validation failed.', errors });
  }

  return buildResult({ valid: true });
};

const validateRetry = async (body = {}) => {
  const errors = [];

  if (body.providerSlug !== undefined && body.providerSlug !== null && typeof body.providerSlug !== 'string') {
    errors.push({ field: 'providerSlug', message: 'providerSlug must be a string.' });
  }

  if (
    body.providerModelSlug !== undefined &&
    body.providerModelSlug !== null &&
    typeof body.providerModelSlug !== 'string'
  ) {
    errors.push({ field: 'providerModelSlug', message: 'providerModelSlug must be a string.' });
  }

  if (body.strategy !== undefined && body.strategy !== null && typeof body.strategy !== 'string') {
    errors.push({ field: 'strategy', message: 'strategy must be a string.' });
  }

  if (errors.length > 0) {
    return buildResult({ valid: false, message: 'Validation failed.', errors });
  }

  return buildResult({ valid: true });
};

const validateJobIdParam = async (params = {}) => {
  const errors = [];
  if (!params.jobId || typeof params.jobId !== 'string') {
    errors.push({ field: 'jobId', message: 'jobId is required.' });
  }
  if (errors.length > 0) {
    return buildResult({ valid: false, message: 'Validation failed.', errors });
  }
  return buildResult({ valid: true });
};

const generationValidator = Object.freeze({
  validateStart,
  validateRetry,
  validateJobIdParam,
});

export default generationValidator;
