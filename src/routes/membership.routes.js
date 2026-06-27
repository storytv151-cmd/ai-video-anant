import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import validation from "../middleware/validation.js";
import asyncHandler from "../utils/asyncHandler.js";
import { REQUEST_SOURCES } from "../utils/constants.js";
import {
  checkMembershipFeature,
  getMembershipFeatures,
} from "../controllers/membership.controller.js";
import membershipValidator from "../validators/membership.validator.js";

const membershipRouter = Router();

membershipRouter.get(
  "/features",
  authenticate,
  asyncHandler(getMembershipFeatures),
);
membershipRouter.post(
  "/check-feature",
  authenticate,
  validation(membershipValidator.validateCheckFeature, REQUEST_SOURCES.BODY),
  asyncHandler(checkMembershipFeature),
);

export default membershipRouter;
