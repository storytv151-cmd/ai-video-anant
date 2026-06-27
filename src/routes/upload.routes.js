import { Router } from "express";
import multer from "multer";
import { authenticate, authorize } from "../middleware/auth.js";
import ROLES from "../constants/roles.js";
import validation from "../middleware/validation.js";
import { REQUEST_SOURCES } from "../utils/constants.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  deleteFile,
  getSignedUrl,
  uploadBanner,
  uploadImage,
  uploadProfile,
  uploadVideo,
} from "../controllers/upload.controller.js";
import uploadValidator from "../validators/upload.validator.js";

const uploadRouter = Router();

const memory = multer.memoryStorage();
const uploadImageParser = multer({
  storage: memory,
  limits: { fileSize: 15 * 1024 * 1024 },
});
const uploadVideoParser = multer({
  storage: memory,
  limits: { fileSize: 120 * 1024 * 1024 },
});

uploadRouter.post(
  "/image",
  authenticate,
  uploadImageParser.single("file"),
  validation(uploadValidator.validateUploadBody, REQUEST_SOURCES.BODY),
  asyncHandler(uploadImage),
);

uploadRouter.post(
  "/profile",
  authenticate,
  uploadImageParser.single("file"),
  validation(uploadValidator.validateUploadBody, REQUEST_SOURCES.BODY),
  asyncHandler(uploadProfile),
);

uploadRouter.post(
  "/banner",
  authenticate,
  authorize(ROLES.ADMIN),
  uploadImageParser.single("file"),
  validation(uploadValidator.validateUploadBody, REQUEST_SOURCES.BODY),
  asyncHandler(uploadBanner),
);

uploadRouter.post(
  "/video",
  authenticate,
  uploadVideoParser.single("file"),
  validation(uploadValidator.validateUploadBody, REQUEST_SOURCES.BODY),
  asyncHandler(uploadVideo),
);

uploadRouter.delete(
  "/:fileId",
  authenticate,
  validation(uploadValidator.validateFileIdParam, REQUEST_SOURCES.PARAMS),
  asyncHandler(deleteFile),
);

uploadRouter.get(
  "/signed-url",
  authenticate,
  validation(uploadValidator.validateSignedUrlQuery, REQUEST_SOURCES.QUERY),
  asyncHandler(getSignedUrl),
);

export default uploadRouter;
