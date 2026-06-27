import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import idempotency from "../middleware/idempotency.js";
import validation from "../middleware/validation.js";
import asyncHandler from "../utils/asyncHandler.js";
import { REQUEST_SOURCES } from "../utils/constants.js";
import {
  getPackages,
  getPaymentDetail,
  getPaymentHistory,
  restorePurchases,
  verifyGooglePurchase,
} from "../controllers/payment.controller.js";
import paymentValidator from "../validators/payment.validator.js";

const paymentRouter = Router();

paymentRouter.get("/packages", asyncHandler(getPackages));
paymentRouter.post(
  "/google/verify",
  authenticate,
  idempotency(false),
  validation(
    paymentValidator.validateVerifyGooglePurchase,
    REQUEST_SOURCES.BODY,
  ),
  asyncHandler(verifyGooglePurchase),
);
paymentRouter.post(
  "/restore",
  authenticate,
  idempotency(false),
  validation(paymentValidator.validateRestorePurchases, REQUEST_SOURCES.BODY),
  asyncHandler(restorePurchases),
);
paymentRouter.get(
  "/history",
  authenticate,
  validation(
    paymentValidator.validatePaymentHistoryQuery,
    REQUEST_SOURCES.QUERY,
  ),
  asyncHandler(getPaymentHistory),
);
paymentRouter.get(
  "/:id",
  authenticate,
  validation(
    paymentValidator.validatePaymentDetailParams,
    REQUEST_SOURCES.PARAMS,
  ),
  asyncHandler(getPaymentDetail),
);

export default paymentRouter;
