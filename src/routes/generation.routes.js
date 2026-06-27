import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import idempotency from "../middleware/idempotency.js";
import validation from "../middleware/validation.js";
import { REQUEST_SOURCES } from "../utils/constants.js";
import asyncHandler from "../utils/asyncHandler.js";
import { cancel, retry, start } from "../controllers/generation.controller.js";
import { getHistory } from "../controllers/generationHistory.controller.js";
import { getStatus } from "../controllers/generationStatus.controller.js";
import generationValidator from "../validators/generation.validator.js";
import historyValidator from "../validators/history.validator.js";
import statusValidator from "../validators/status.validator.js";

const generationRouter = Router();

generationRouter.post(
  "/start",
  authenticate,
  idempotency(false),
  validation(generationValidator.validateStart, REQUEST_SOURCES.BODY),
  asyncHandler(start),
);

generationRouter.get(
  "/status/:jobId",
  authenticate,
  validation(statusValidator.validateJobIdParam, REQUEST_SOURCES.PARAMS),
  asyncHandler(getStatus),
);

generationRouter.get(
  "/history",
  authenticate,
  validation(historyValidator.validateHistoryQuery, REQUEST_SOURCES.QUERY),
  asyncHandler(getHistory),
);

generationRouter.post(
  "/cancel/:jobId",
  authenticate,
  idempotency(false),
  validation(generationValidator.validateJobIdParam, REQUEST_SOURCES.PARAMS),
  asyncHandler(cancel),
);

generationRouter.post(
  "/retry/:jobId",
  authenticate,
  idempotency(false),
  validation(generationValidator.validateJobIdParam, REQUEST_SOURCES.PARAMS),
  validation(generationValidator.validateRetry, REQUEST_SOURCES.BODY),
  asyncHandler(retry),
);

export default generationRouter;
