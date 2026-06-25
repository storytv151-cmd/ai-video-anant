const buildResult = ({ valid = true, message = '', errors = [] } = {}) => ({ valid, message, errors });

const validateRtdnWebhook = async (body = {}) => {
  const errors = [];
  if (!body.message || typeof body.message !== 'object') {
    errors.push({ field: 'message', message: 'message is required.' });
  } else if (!body.message.data || typeof body.message.data !== 'string') {
    errors.push({ field: 'message.data', message: 'message.data must be a base64 string.' });
  }
  return errors.length > 0 ? buildResult({ valid: false, message: 'Validation failed.', errors }) : buildResult({ valid: true });
};

const googleValidator = Object.freeze({
  validateRtdnWebhook,
});

export default googleValidator;
