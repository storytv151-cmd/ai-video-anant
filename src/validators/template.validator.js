/**
 * Template validators.
 * Validates template list/search inputs and route parameters.
 */
const buildResult = ({ valid = true, message = "", errors = [] } = {}) => ({
  valid,
  message,
  errors,
});

const validateList = async (query = {}) => {
  const errors = [];

  const page = query.page !== undefined ? Number(query.page) : null;
  const limit = query.limit !== undefined ? Number(query.limit) : null;

  if (page !== null && (!Number.isFinite(page) || page <= 0)) {
    errors.push({ field: "page", message: "Page must be a positive number." });
  }

  if (
    limit !== null &&
    (!Number.isFinite(limit) || limit <= 0 || limit > 100)
  ) {
    errors.push({
      field: "limit",
      message: "Limit must be between 1 and 100.",
    });
  }

  if (query.minCredits !== undefined) {
    const min = Number(query.minCredits);
    if (!Number.isFinite(min) || min < 0) {
      errors.push({
        field: "minCredits",
        message: "minCredits must be a non-negative number.",
      });
    }
  }

  if (query.maxCredits !== undefined) {
    const max = Number(query.maxCredits);
    if (!Number.isFinite(max) || max < 0) {
      errors.push({
        field: "maxCredits",
        message: "maxCredits must be a non-negative number.",
      });
    }
  }

  if (errors.length > 0) {
    return buildResult({ valid: false, message: "Validation failed.", errors });
  }

  return buildResult({ valid: true });
};

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

const templateValidator = Object.freeze({
  validateList,
  validateSlugParam,
});

export default templateValidator;
