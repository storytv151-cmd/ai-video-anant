/**
 * Transaction validators.
 * Validates transaction listing and retrieval requests.
 */
const buildResult = ({ valid = true, message = "", errors = [] } = {}) => ({
  valid,
  message,
  errors,
});

const validateList = async (query = {}) => {
  const errors = [];

  if (query.page !== undefined) {
    const parsed = Number(query.page);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      errors.push({
        field: "page",
        message: "Page must be a positive number.",
      });
    }
  }

  if (query.limit !== undefined) {
    const parsed = Number(query.limit);
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 100) {
      errors.push({
        field: "limit",
        message: "Limit must be between 1 and 100.",
      });
    }
  }

  if (query.dateFrom) {
    const d = new Date(query.dateFrom);
    if (Number.isNaN(d.getTime())) {
      errors.push({
        field: "dateFrom",
        message: "dateFrom must be a valid date.",
      });
    }
  }

  if (query.dateTo) {
    const d = new Date(query.dateTo);
    if (Number.isNaN(d.getTime())) {
      errors.push({ field: "dateTo", message: "dateTo must be a valid date." });
    }
  }

  if (errors.length > 0) {
    return buildResult({ valid: false, message: "Validation failed.", errors });
  }

  return buildResult({ valid: true });
};

const validateGetById = async (params = {}) => {
  const errors = [];
  if (!params.id || typeof params.id !== "string") {
    errors.push({ field: "id", message: "Transaction id is required." });
  }

  if (errors.length > 0) {
    return buildResult({ valid: false, message: "Validation failed.", errors });
  }

  return buildResult({ valid: true });
};

const transactionValidator = Object.freeze({
  validateList,
  validateGetById,
});

export default transactionValidator;
