import { Router } from "express";
import ADMIN_PERMISSIONS from "../constants/adminPermissions.js";
import { authenticate } from "../middleware/auth.js";
import {
  requireAdminAccess,
  requireAdminPermission,
} from "../middleware/adminAccess.js";
import validation from "../middleware/validation.js";
import { REQUEST_SOURCES } from "../utils/constants.js";
import asyncHandler from "../utils/asyncHandler.js";
import providerValidator from "../validators/provider.validator.js";
import {
  getProviderAdmin,
  healthAdmin,
  listProvidersAdmin,
  pricingAdmin,
} from "../controllers/providerAdmin.controller.js";

const providerAdminRouter = Router();

providerAdminRouter.use(
  authenticate,
  requireAdminAccess,
  requireAdminPermission(ADMIN_PERMISSIONS.PROVIDERS_READ),
);

providerAdminRouter.get("/", asyncHandler(listProvidersAdmin));
providerAdminRouter.get("/health", asyncHandler(healthAdmin));
providerAdminRouter.get("/pricing", asyncHandler(pricingAdmin));
providerAdminRouter.get(
  "/:slug",
  validation(providerValidator.validateSlugParam, REQUEST_SOURCES.PARAMS),
  asyncHandler(getProviderAdmin),
);

export default providerAdminRouter;
