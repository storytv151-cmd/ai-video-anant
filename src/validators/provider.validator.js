const buildResult = ({ valid = true, message = "", errors = [] } = {}) => ({
  valid,
  message,
  errors,
});

const validateList = async () => buildResult({ valid: true });

const validateSlugParam = async (params = {}) => {
  const errors = [];
  if (!params.slug || typeof params.slug !== "string") {
    errors.push({ field: "slug", message: "slug is required." });
  }
  if (errors.length > 0) {
    return buildResult({ valid: false, message: "Validation failed.", errors });
  }
  return buildResult({ valid: true });
};

const providerValidator = Object.freeze({
  validateList,
  validateSlugParam,
});

export default providerValidator;
