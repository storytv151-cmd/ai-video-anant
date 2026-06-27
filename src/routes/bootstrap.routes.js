/**
 * Bootstrap routes.
 * Provides a single endpoint that returns all dynamic configuration needed by clients.
 */
import { Router } from "express";
import { optionalAuth } from "../middleware/auth.js";
import validation from "../middleware/validation.js";
import bootstrapValidator from "../validators/bootstrap.validator.js";
import asyncHandler from "../utils/asyncHandler.js";
import { getBootstrap } from "../controllers/bootstrap.controller.js";

const bootstrapRouter = Router();

bootstrapRouter.get(
  "/",
  optionalAuth,
  validation(bootstrapValidator.validateBootstrap),
  asyncHandler(getBootstrap),
);

export default bootstrapRouter;
