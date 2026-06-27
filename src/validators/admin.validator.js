import mongoose from "mongoose";

const buildResult = ({ valid = true, message = "", errors = [] } = {}) => ({
  valid,
  message,
  errors,
});

const requireObjectId = ({ value, field, errors }) => {
  if (!value || !mongoose.isValidObjectId(value)) {
    errors.push({ field, message: `${field} must be a valid id.` });
  }
};

const validateAdminListQuery = async () => buildResult({ valid: true });

const validateUserIdParam = async (params = {}) => {
  const errors = [];
  requireObjectId({ value: params.userId, field: "userId", errors });
  return errors.length > 0
    ? buildResult({ valid: false, message: "Validation failed.", errors })
    : buildResult({ valid: true });
};

const validatePaymentIdParam = async (params = {}) => {
  const errors = [];
  requireObjectId({ value: params.paymentId, field: "paymentId", errors });
  return errors.length > 0
    ? buildResult({ valid: false, message: "Validation failed.", errors })
    : buildResult({ valid: true });
};

const validateTemplateIdParam = async (params = {}) => {
  const errors = [];
  requireObjectId({ value: params.templateId, field: "templateId", errors });
  return errors.length > 0
    ? buildResult({ valid: false, message: "Validation failed.", errors })
    : buildResult({ valid: true });
};

const validateCategoryIdParam = async (params = {}) => {
  const errors = [];
  requireObjectId({ value: params.categoryId, field: "categoryId", errors });
  return errors.length > 0
    ? buildResult({ valid: false, message: "Validation failed.", errors })
    : buildResult({ valid: true });
};

const validateProviderIdParam = async (params = {}) => {
  const errors = [];
  requireObjectId({ value: params.providerId, field: "providerId", errors });
  return errors.length > 0
    ? buildResult({ valid: false, message: "Validation failed.", errors })
    : buildResult({ valid: true });
};

const validateModelIdParam = async (params = {}) => {
  const errors = [];
  requireObjectId({ value: params.modelId, field: "modelId", errors });
  return errors.length > 0
    ? buildResult({ valid: false, message: "Validation failed.", errors })
    : buildResult({ valid: true });
};

const validateCouponIdParam = async (params = {}) => {
  const errors = [];
  requireObjectId({ value: params.couponId, field: "couponId", errors });
  return errors.length > 0
    ? buildResult({ valid: false, message: "Validation failed.", errors })
    : buildResult({ valid: true });
};

const validateJobIdParam = async (params = {}) => {
  const errors = [];
  requireObjectId({ value: params.jobId, field: "jobId", errors });
  return errors.length > 0
    ? buildResult({ valid: false, message: "Validation failed.", errors })
    : buildResult({ valid: true });
};

const validateStatusBody = async (body = {}) => {
  const errors = [];
  if (!body.status || typeof body.status !== "string") {
    errors.push({ field: "status", message: "status is required." });
  }
  return errors.length > 0
    ? buildResult({ valid: false, message: "Validation failed.", errors })
    : buildResult({ valid: true });
};

const validateCreditsBody = async (body = {}) => {
  const errors = [];
  if (!Number.isFinite(Number(body.credits)) || Number(body.credits) <= 0) {
    errors.push({
      field: "credits",
      message: "credits must be a positive number.",
    });
  }
  return errors.length > 0
    ? buildResult({ valid: false, message: "Validation failed.", errors })
    : buildResult({ valid: true });
};

const validateRoleAssignmentBody = async (body = {}) => {
  const errors = [];
  if (!body.role || typeof body.role !== "string") {
    errors.push({ field: "role", message: "role is required." });
  }
  if (
    body.adminRoleCode !== undefined &&
    body.adminRoleCode !== null &&
    typeof body.adminRoleCode !== "string"
  ) {
    errors.push({
      field: "adminRoleCode",
      message: "adminRoleCode must be a string.",
    });
  }
  return errors.length > 0
    ? buildResult({ valid: false, message: "Validation failed.", errors })
    : buildResult({ valid: true });
};

const validateTemplateCreateBody = async (body = {}) => {
  const errors = [];
  requireObjectId({ value: body.category, field: "category", errors });
  if (!body.title || typeof body.title !== "string") {
    errors.push({ field: "title", message: "title is required." });
  }
  if (!body.prompt || typeof body.prompt !== "string") {
    errors.push({ field: "prompt", message: "prompt is required." });
  }
  if (!Number.isFinite(Number(body.duration)) || Number(body.duration) <= 0) {
    errors.push({
      field: "duration",
      message: "duration must be a positive number.",
    });
  }
  return errors.length > 0
    ? buildResult({ valid: false, message: "Validation failed.", errors })
    : buildResult({ valid: true });
};

const validateTemplateUpdateBody = async () => buildResult({ valid: true });

const validateCategoryBody = async (body = {}) => {
  const errors = [];
  if (!body.title || typeof body.title !== "string") {
    errors.push({ field: "title", message: "title is required." });
  }
  return errors.length > 0
    ? buildResult({ valid: false, message: "Validation failed.", errors })
    : buildResult({ valid: true });
};

const validateProviderPricingBody = async (body = {}) => {
  const errors = [];
  requireObjectId({ value: body.provider, field: "provider", errors });
  if (!body.quality || typeof body.quality !== "string") {
    errors.push({ field: "quality", message: "quality is required." });
  }
  if (!Number.isFinite(Number(body.duration)) || Number(body.duration) <= 0) {
    errors.push({
      field: "duration",
      message: "duration must be a positive number.",
    });
  }
  if (!Number.isFinite(Number(body.credits)) || Number(body.credits) < 0) {
    errors.push({
      field: "credits",
      message: "credits must be zero or greater.",
    });
  }
  return errors.length > 0
    ? buildResult({ valid: false, message: "Validation failed.", errors })
    : buildResult({ valid: true });
};

const validateSubscriptionActionBody = async (body = {}) => {
  const errors = [];
  if (
    body.planCode !== undefined &&
    body.planCode !== null &&
    typeof body.planCode !== "string"
  ) {
    errors.push({ field: "planCode", message: "planCode must be a string." });
  }
  if (
    body.days !== undefined &&
    (!Number.isFinite(Number(body.days)) || Number(body.days) <= 0)
  ) {
    errors.push({ field: "days", message: "days must be a positive number." });
  }
  return errors.length > 0
    ? buildResult({ valid: false, message: "Validation failed.", errors })
    : buildResult({ valid: true });
};

const validateNotificationBody = async (body = {}) => {
  const errors = [];
  if (!body.title || typeof body.title !== "string") {
    errors.push({ field: "title", message: "title is required." });
  }
  if (!body.message || typeof body.message !== "string") {
    errors.push({ field: "message", message: "message is required." });
  }
  if (body.userId !== undefined && body.userId !== null) {
    requireObjectId({ value: body.userId, field: "userId", errors });
  }
  if (body.userIds !== undefined && !Array.isArray(body.userIds)) {
    errors.push({ field: "userIds", message: "userIds must be an array." });
  }
  return errors.length > 0
    ? buildResult({ valid: false, message: "Validation failed.", errors })
    : buildResult({ valid: true });
};

const adminValidator = Object.freeze({
  validateAdminListQuery,
  validateUserIdParam,
  validatePaymentIdParam,
  validateTemplateIdParam,
  validateCategoryIdParam,
  validateProviderIdParam,
  validateModelIdParam,
  validateCouponIdParam,
  validateJobIdParam,
  validateStatusBody,
  validateCreditsBody,
  validateRoleAssignmentBody,
  validateTemplateCreateBody,
  validateTemplateUpdateBody,
  validateCategoryBody,
  validateProviderPricingBody,
  validateSubscriptionActionBody,
  validateNotificationBody,
});

export default adminValidator;
