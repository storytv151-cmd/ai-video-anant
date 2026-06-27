const buildResult = ({ valid = true, message = "", errors = [] } = {}) => ({
  valid,
  message,
  errors,
});

const validateListPlans = async () => buildResult({ valid: true });

const validateCurrentSubscription = async () => buildResult({ valid: true });

const validateVerifyGoogleSubscription = async (body = {}) => {
  const errors = [];
  if (!body.purchaseToken || typeof body.purchaseToken !== "string") {
    errors.push({
      field: "purchaseToken",
      message: "purchaseToken is required.",
    });
  }
  if (
    body.productId !== undefined &&
    body.productId !== null &&
    typeof body.productId !== "string"
  ) {
    errors.push({ field: "productId", message: "productId must be a string." });
  }
  if (
    body.packageName !== undefined &&
    body.packageName !== null &&
    typeof body.packageName !== "string"
  ) {
    errors.push({
      field: "packageName",
      message: "packageName must be a string.",
    });
  }
  return errors.length > 0
    ? buildResult({ valid: false, message: "Validation failed.", errors })
    : buildResult({ valid: true });
};

const validateRestoreGoogleSubscriptions = async (body = {}) => {
  const errors = [];
  if (body.purchases !== undefined && !Array.isArray(body.purchases)) {
    errors.push({ field: "purchases", message: "purchases must be an array." });
  }
  if (Array.isArray(body.purchases)) {
    for (let index = 0; index < body.purchases.length; index += 1) {
      const item = body.purchases[index] || {};
      if (!item.purchaseToken || typeof item.purchaseToken !== "string") {
        errors.push({
          field: `purchases[${index}].purchaseToken`,
          message: "purchaseToken is required.",
        });
      }
      if (
        item.packageName !== undefined &&
        item.packageName !== null &&
        typeof item.packageName !== "string"
      ) {
        errors.push({
          field: `purchases[${index}].packageName`,
          message: "packageName must be a string.",
        });
      }
      if (
        item.productId !== undefined &&
        item.productId !== null &&
        typeof item.productId !== "string"
      ) {
        errors.push({
          field: `purchases[${index}].productId`,
          message: "productId must be a string.",
        });
      }
    }
  }
  if (
    body.purchaseTokens !== undefined &&
    !Array.isArray(body.purchaseTokens)
  ) {
    errors.push({
      field: "purchaseTokens",
      message: "purchaseTokens must be an array.",
    });
  }
  if (body.productIds !== undefined && !Array.isArray(body.productIds)) {
    errors.push({
      field: "productIds",
      message: "productIds must be an array.",
    });
  }
  if (!Array.isArray(body.purchases) && !Array.isArray(body.purchaseTokens)) {
    errors.push({
      field: "purchases",
      message: "Provide purchases or purchaseTokens for restore.",
    });
  }
  return errors.length > 0
    ? buildResult({ valid: false, message: "Validation failed.", errors })
    : buildResult({ valid: true });
};

const validateSubscriptionStatusQuery = async () =>
  buildResult({ valid: true });

const validateSubscriptionHistory = async (query = {}) => {
  const errors = [];
  if (query.page !== undefined) {
    const page = Number(query.page);
    if (!Number.isFinite(page) || page <= 0) {
      errors.push({
        field: "page",
        message: "page must be a positive number.",
      });
    }
  }
  if (query.limit !== undefined) {
    const limit = Number(query.limit);
    if (!Number.isFinite(limit) || limit <= 0 || limit > 100) {
      errors.push({
        field: "limit",
        message: "limit must be between 1 and 100.",
      });
    }
  }
  if (
    query.sort !== undefined &&
    !["asc", "desc", "oldest", "latest"].includes(
      String(query.sort).trim().toLowerCase(),
    )
  ) {
    errors.push({
      field: "sort",
      message: "sort must be asc, desc, oldest, or latest.",
    });
  }
  return errors.length > 0
    ? buildResult({ valid: false, message: "Validation failed.", errors })
    : buildResult({ valid: true });
};

const subscriptionValidator = Object.freeze({
  validateListPlans,
  validateCurrentSubscription,
  validateVerifyGoogleSubscription,
  validateRestoreGoogleSubscriptions,
  validateSubscriptionStatusQuery,
  validateSubscriptionHistory,
});

export default subscriptionValidator;
