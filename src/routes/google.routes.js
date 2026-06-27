import { Router } from "express";
import validation from "../middleware/validation.js";
import asyncHandler from "../utils/asyncHandler.js";
import { REQUEST_SOURCES } from "../utils/constants.js";
import { handleGoogleRtdnWebhook } from "../controllers/google.controller.js";
import googleValidator from "../validators/google.validator.js";

const googleRouter = Router();

googleRouter.post(
  "/rtdn/webhook",
  validation(googleValidator.validateRtdnWebhook, REQUEST_SOURCES.BODY),
  asyncHandler(handleGoogleRtdnWebhook),
);

export default googleRouter;
