const buildResult = ({ valid = true, message = "", errors = [] } = {}) => ({
  valid,
  message,
  errors,
});

const validateAssetArray = (items, field, errors) => {
  if (!Array.isArray(items)) {
    errors.push({ field, message: `${field} must be an array.` });
    return;
  }
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    if (!item || typeof item !== "object") {
      errors.push({
        field: `${field}[${i}]`,
        message: "Each asset must be an object.",
      });
      continue;
    }
    if (!item.url || typeof item.url !== "string") {
      errors.push({
        field: `${field}[${i}].url`,
        message: "Asset url is required.",
      });
    }
  }
};

const validateStart = async (body = {}) => {
  const errors = [];

  if (!body.templateSlug || typeof body.templateSlug !== "string") {
    errors.push({
      field: "templateSlug",
      message: "templateSlug is required.",
    });
  }

  if (
    body.providerSlug !== undefined &&
    body.providerSlug !== null &&
    typeof body.providerSlug !== "string"
  ) {
    errors.push({
      field: "providerSlug",
      message: "providerSlug must be a string.",
    });
  }

  if (
    body.providerModelSlug !== undefined &&
    body.providerModelSlug !== null &&
    typeof body.providerModelSlug !== "string"
  ) {
    errors.push({
      field: "providerModelSlug",
      message: "providerModelSlug must be a string.",
    });
  }

  if (
    body.strategy !== undefined &&
    body.strategy !== null &&
    typeof body.strategy !== "string"
  ) {
    errors.push({ field: "strategy", message: "strategy must be a string." });
  }

  if (body.inputImages !== undefined && body.inputImages !== null) {
    validateAssetArray(body.inputImages, "inputImages", errors);
  }

  if (body.inputVideos !== undefined && body.inputVideos !== null) {
    validateAssetArray(body.inputVideos, "inputVideos", errors);
  }

  if (body.inputAudio !== undefined && body.inputAudio !== null) {
    validateAssetArray(body.inputAudio, "inputAudio", errors);
  }

  if (body.referenceImages !== undefined && body.referenceImages !== null) {
    validateAssetArray(body.referenceImages, "referenceImages", errors);
  }

  if (body.maskImages !== undefined && body.maskImages !== null) {
    validateAssetArray(body.maskImages, "maskImages", errors);
  }

  if (
    body.prompt !== undefined &&
    body.prompt !== null &&
    typeof body.prompt !== "string"
  ) {
    errors.push({ field: "prompt", message: "prompt must be a string." });
  }

  if (
    body.negativePrompt !== undefined &&
    body.negativePrompt !== null &&
    typeof body.negativePrompt !== "string"
  ) {
    errors.push({
      field: "negativePrompt",
      message: "negativePrompt must be a string.",
    });
  }

  if (
    body.generationType !== undefined &&
    body.generationType !== null &&
    typeof body.generationType !== "string"
  ) {
    errors.push({
      field: "generationType",
      message: "generationType must be a string.",
    });
  }

  if (
    body.outputType !== undefined &&
    body.outputType !== null &&
    typeof body.outputType !== "string"
  ) {
    errors.push({
      field: "outputType",
      message: "outputType must be a string.",
    });
  }

  if (
    body.multipleOutputs !== undefined &&
    typeof body.multipleOutputs !== "boolean"
  ) {
    errors.push({
      field: "multipleOutputs",
      message: "multipleOutputs must be a boolean.",
    });
  }

  if (errors.length > 0) {
    return buildResult({ valid: false, message: "Validation failed.", errors });
  }

  return buildResult({ valid: true });
};

const validateRetry = async (body = {}) => {
  const errors = [];

  if (
    body.providerSlug !== undefined &&
    body.providerSlug !== null &&
    typeof body.providerSlug !== "string"
  ) {
    errors.push({
      field: "providerSlug",
      message: "providerSlug must be a string.",
    });
  }

  if (
    body.providerModelSlug !== undefined &&
    body.providerModelSlug !== null &&
    typeof body.providerModelSlug !== "string"
  ) {
    errors.push({
      field: "providerModelSlug",
      message: "providerModelSlug must be a string.",
    });
  }

  if (
    body.strategy !== undefined &&
    body.strategy !== null &&
    typeof body.strategy !== "string"
  ) {
    errors.push({ field: "strategy", message: "strategy must be a string." });
  }

  if (errors.length > 0) {
    return buildResult({ valid: false, message: "Validation failed.", errors });
  }

  return buildResult({ valid: true });
};

const validateJobIdParam = async (params = {}) => {
  const errors = [];
  if (!params.jobId || typeof params.jobId !== "string") {
    errors.push({ field: "jobId", message: "jobId is required." });
  }
  if (errors.length > 0) {
    return buildResult({ valid: false, message: "Validation failed.", errors });
  }
  return buildResult({ valid: true });
};

const generationValidator = Object.freeze({
  validateStart,
  validateRetry,
  validateJobIdParam,
});

export default generationValidator;
