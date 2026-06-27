/**
 * Authentication routes.
 * These endpoints implement Google OAuth login and JWT session management.
 */
import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import validation from "../middleware/validation.js";
import authValidator from "../validators/auth.validator.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  googleLogin,
  logout,
  logoutAll,
  me,
  refresh,
} from "../controllers/auth.controller.js";

const authRouter = Router();

authRouter.post(
  "/google",
  validation(authValidator.validateGoogleLogin),
  asyncHandler(googleLogin),
);
authRouter.post(
  "/refresh",
  validation(authValidator.validateRefresh),
  asyncHandler(refresh),
);
authRouter.post(
  "/logout",
  validation(authValidator.validateLogout),
  asyncHandler(logout),
);
authRouter.post("/logout-all", authenticate, asyncHandler(logoutAll));
authRouter.get("/me", authenticate, asyncHandler(me));

export default authRouter;
