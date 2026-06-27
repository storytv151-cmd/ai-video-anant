const buildResult = ({ valid = true, message = "", errors = [] } = {}) => ({
  valid,
  message,
  errors,
});

const validateHistoryQuery = async (query = {}) => {
  const errors = [];

  if (query.page !== undefined) {
    const n = Number(query.page);
    if (!Number.isFinite(n) || n <= 0) {
      errors.push({
        field: "page",
        message: "page must be a positive number.",
      });
    }
  }

  if (query.limit !== undefined) {
    const n = Number(query.limit);
    if (!Number.isFinite(n) || n <= 0 || n > 100) {
      errors.push({
        field: "limit",
        message: "limit must be between 1 and 100.",
      });
    }
  }

  if (query.from !== undefined && query.from !== null && query.from !== "") {
    const d = new Date(query.from);
    if (Number.isNaN(d.getTime())) {
      errors.push({ field: "from", message: "from must be a valid date." });
    }
  }

  if (query.to !== undefined && query.to !== null && query.to !== "") {
    const d = new Date(query.to);
    if (Number.isNaN(d.getTime())) {
      errors.push({ field: "to", message: "to must be a valid date." });
    }
  }

  if (errors.length > 0) {
    return buildResult({ valid: false, message: "Validation failed.", errors });
  }

  return buildResult({ valid: true });
};

const historyValidator = Object.freeze({
  validateHistoryQuery,
});

export default historyValidator;
