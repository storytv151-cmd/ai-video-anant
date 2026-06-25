const buildResult = ({ valid = true, message = '', errors = [] } = {}) => ({ valid, message, errors });

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

const statusValidator = Object.freeze({
  validateJobIdParam,
});

export default statusValidator;
