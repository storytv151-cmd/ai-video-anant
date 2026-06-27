/**
 * Health and root routes for both public and versioned API entrypoints.
 * The handlers remain thin by delegating all data assembly to controllers.
 */
import { Router } from "express";
import asyncHandler from "../utils/asyncHandler.js";
import {
  getHealth,
  getRoot,
  getVersionedRoot,
} from "../controllers/health.controller.js";

const publicHealthRouter = Router();
const versionedHealthRouter = Router();

publicHealthRouter.get("/", asyncHandler(getRoot));
publicHealthRouter.get("/health", asyncHandler(getHealth));

versionedHealthRouter.get("/", asyncHandler(getVersionedRoot));

export { publicHealthRouter, versionedHealthRouter };
