/**
 * Reward routes.
 * Implements claim endpoints for reward programs.
 */
import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import idempotency from "../middleware/idempotency.js";
import validation from "../middleware/validation.js";
import asyncHandler from "../utils/asyncHandler.js";
import { REQUEST_SOURCES } from "../utils/constants.js";
import rewardValidator from "../validators/reward.validator.js";
import {
  claimDailyBonus,
  claimRewardAd,
} from "../controllers/reward.controller.js";

const rewardRouter = Router();

rewardRouter.post(
  "/ad",
  authenticate,
  idempotency(false),
  validation(rewardValidator.validateRewardAd, REQUEST_SOURCES.BODY),
  asyncHandler(claimRewardAd),
);
rewardRouter.post(
  "/daily",
  authenticate,
  idempotency(false),
  validation(rewardValidator.validateDailyBonus),
  asyncHandler(claimDailyBonus),
);

export default rewardRouter;
