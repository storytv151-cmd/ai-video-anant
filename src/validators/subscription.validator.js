const buildResult = ({ valid = true, message = '', errors = [] } = {}) => ({ valid, message, errors });

const validateListPlans = async () => buildResult({ valid: true });

const validateCurrentSubscription = async () => buildResult({ valid: true });

const subscriptionValidator = Object.freeze({
  validateListPlans,
  validateCurrentSubscription,
});

export default subscriptionValidator;
