const buildResult = ({ valid = true, message = "", errors = [] } = {}) => ({
  valid,
  message,
  errors,
});

const validateCheckFeature = async (body = {}) => {
  const errors = [];
  if (!body.featureName || typeof body.featureName !== "string") {
    errors.push({ field: "featureName", message: "featureName is required." });
  }
  return errors.length > 0
    ? buildResult({ valid: false, message: "Validation failed.", errors })
    : buildResult({ valid: true });
};

const membershipValidator = Object.freeze({
  validateCheckFeature,
});

export default membershipValidator;
