/**
 * Authentication request validators.
 * These validators only validate request shape and basic constraints.
 */
const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

const buildResult = ({ valid = true, message = "", errors = [] } = {}) => ({
  valid,
  message,
  errors,
});

const validateGoogleLogin = async (payload) => {
  const errors = [];

  console.log("ID TOKEN:", payload.idToken);
  console.log("TYPE:", typeof payload.idToken);
  console.log("PARTS:", payload.idToken.split(".").length);
  if (!payload || typeof payload !== "object") {
    return buildResult({ valid: false, message: "Request body is required." });
  }

  if (!isNonEmptyString(payload.idToken)) {
    errors.push({ field: "idToken", message: "Google ID token is required." });
  }

  const device = payload.device;
  if (!device || typeof device !== "object") {
    errors.push({
      field: "device",
      message: "Device information is required.",
    });
  } else {
    const validPlatforms = ["web", "ios", "android", "desktop", "other"];
    if (
      !isNonEmptyString(device.platform) ||
      !validPlatforms.includes(device.platform)
    ) {
      errors.push({
        field: "device.platform",
        message: `Platform must be one of: ${validPlatforms.join(", ")}`,
      });
    }

    if (
      !isNonEmptyString(device.deviceId) ||
      device.deviceId.trim().length > 255
    ) {
      errors.push({
        field: "device.deviceId",
        message: "Device ID is required (max 255 chars).",
      });
    }

    if (device.appVersion !== undefined && device.appVersion !== null) {
      if (
        !isNonEmptyString(device.appVersion) ||
        device.appVersion.trim().length > 50
      ) {
        errors.push({
          field: "device.appVersion",
          message: "App version must be a string (max 50 chars).",
        });
      }
    }

    if (device.osVersion !== undefined && device.osVersion !== null) {
      if (
        !isNonEmptyString(device.osVersion) ||
        device.osVersion.trim().length > 50
      ) {
        errors.push({
          field: "device.osVersion",
          message: "OS version must be a string (max 50 chars).",
        });
      }
    }

    if (device.pushToken !== undefined && device.pushToken !== null) {
      if (
        !isNonEmptyString(device.pushToken) ||
        device.pushToken.trim().length > 1024
      ) {
        errors.push({
          field: "device.pushToken",
          message: "Push token must be a string (max 1024 chars).",
        });
      }
    }

    if (device.model !== undefined && device.model !== null) {
      if (!isNonEmptyString(device.model) || device.model.trim().length > 120) {
        errors.push({
          field: "device.model",
          message: "Device model must be a string (max 120 chars).",
        });
      }
    }
  }

  if (payload.idToken && typeof payload.idToken === "string") {
    const tokenLike = payload.idToken.split(".").length === 3;
    if (!tokenLike) {
      errors.push({
        field: "idToken",
        message: "Google ID token format appears invalid.",
      });
    }
  }

  if (errors.length > 0) {
    return buildResult({ valid: false, message: "Validation failed.", errors });
  }

  return buildResult({ valid: true });
};

const validateRefresh = async (payload) => {
  if (
    payload &&
    typeof payload === "object" &&
    payload.refreshToken !== undefined &&
    payload.refreshToken !== null
  ) {
    if (!isNonEmptyString(payload.refreshToken)) {
      return buildResult({
        valid: false,
        message: "Refresh token must be a non-empty string when provided.",
        errors: [{ field: "refreshToken", message: "Invalid refresh token." }],
      });
    }
  }

  return buildResult({ valid: true });
};

const validateLogout = validateRefresh;

const validateMe = async () => buildResult({ valid: true });

const authValidator = Object.freeze({
  validateGoogleLogin,
  validateRefresh,
  validateLogout,
  validateMe,
});

export default authValidator;
