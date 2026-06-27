/**
 * Constants namespace placeholder for future domain-level constants.
 * Business configuration values should still remain environment-driven.
 */
import APP_CONSTANTS from "./appConstants.js";
import ADMIN_PERMISSIONS from "./adminPermissions.js";
import ERROR_CODES from "./errorCodes.js";
import FEATURE_FLAGS from "./featureFlags.js";
import HTTP_STATUS from "./httpStatus.js";
import PROVIDER_NAMES from "./providerNames.js";
import ROLES from "./roles.js";

const domainConstants = Object.freeze({
  APP_CONSTANTS,
  ADMIN_PERMISSIONS,
  ERROR_CODES,
  FEATURE_FLAGS,
  HTTP_STATUS,
  PROVIDER_NAMES,
  ROLES,
});

export default domainConstants;
