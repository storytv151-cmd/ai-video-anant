/**
 * Wallet validators.
 * Validates wallet-related requests for pagination and payload shape.
 */
const buildResult = ({ valid = true, message = "", errors = [] } = {}) => ({
  valid,
  message,
  errors,
});

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

const validateGetWallet = async () => buildResult({ valid: true });

const validateGetWalletSummary = async () => buildResult({ valid: true });

const validateGetWalletHistory = async (query = {}) => {
  const errors = [];
  const page = query.page;
  const limit = query.limit;

  if (page !== undefined && page !== null) {
    const parsed = Number(page);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      errors.push({
        field: "page",
        message: "Page must be a positive number.",
      });
    }
  }

  if (limit !== undefined && limit !== null) {
    const parsed = Number(limit);
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 100) {
      errors.push({
        field: "limit",
        message: "Limit must be between 1 and 100.",
      });
    }
  }

  if (query?.dateFrom) {
    const d = new Date(query.dateFrom);
    if (Number.isNaN(d.getTime())) {
      errors.push({
        field: "dateFrom",
        message: "dateFrom must be a valid date.",
      });
    }
  }

  if (query?.dateTo) {
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

const validateRedeemPromo = async (body = {}) => {
  const errors = [];
  if (!isNonEmptyString(body.code)) {
    errors.push({ field: "code", message: "Coupon code is required." });
  }

  if (errors.length > 0) {
    return buildResult({ valid: false, message: "Validation failed.", errors });
  }

  return buildResult({ valid: true });
};

const walletValidator = Object.freeze({
  validateGetWallet,
  validateGetWalletHistory,
  validateGetWalletSummary,
  validateRedeemPromo,
});

export default walletValidator;
