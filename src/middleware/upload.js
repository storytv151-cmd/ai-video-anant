/**
 * Multer upload middleware configuration for future media ingestion endpoints.
 * Files are currently kept in memory so later phases can pass them to storage services.
 */
import multer from "multer";
import environment from "../config/environment.js";
import ApiError from "../utils/ApiError.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: environment.upload.maxFileSize,
  },
  fileFilter: (request, file, callback) => {
    if (
      environment.upload.allowedMimeTypes.length > 0 &&
      !environment.upload.allowedMimeTypes.includes(file.mimetype)
    ) {
      callback(
        new ApiError(400, `Unsupported file type: ${file.mimetype}`, {
          code: "UPLOAD_UNSUPPORTED_TYPE",
        }),
      );
      return;
    }

    callback(null, true);
  },
});

export default upload;
