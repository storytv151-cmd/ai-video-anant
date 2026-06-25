/**
 * Reward validators.
 * Validates reward claim requests and keeps request contracts future-ready.
 */
const buildResult = ({ valid = true, message = '', errors = [] } = {}) => ({ valid, message, errors });

const validateDailyBonus = async () => buildResult({ valid: true });

const validateRewardAd = async (body = {}) => {
  const errors = [];

  if (body && typeof body === 'object' && body.adProof !== undefined && body.adProof !== null && typeof body.adProof !== 'string') {
    errors.push({ field: 'adProof', message: 'adProof must be a string when provided.' });
  }

  if (errors.length > 0) {
    return buildResult({ valid: false, message: 'Validation failed.', errors });
  }

  return buildResult({ valid: true });
};

const rewardValidator = Object.freeze({
  validateDailyBonus,
  validateRewardAd,
});

export default rewardValidator;
