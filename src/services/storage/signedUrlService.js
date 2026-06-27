import ApiError from "../../utils/ApiError.js";
import environment from "../../config/environment.js";
import digitalOceanSpaces from "./digitalOceanSpaces.js";
import storageValidationService from "./storageValidationService.js";

const parseExpiresIn = (value, fallback) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    return fallback;
  }
  return Math.min(Math.floor(n), 3600);
};

const generateSignedUploadUrl = async ({
  folder,
  mimeType,
  fileType,
  expiresInSeconds = 900,
} = {}) => {
  const bucket = environment.integrations.digitalOceanSpaces.bucket;
  if (!bucket) {
    throw new ApiError(500, "Storage is not configured.", {
      code: "STORAGE_NOT_CONFIGURED",
    });
  }

  const extension = storageValidationService.resolveExtensionForMimeType({
    mimeType,
    fileType,
  });
  if (!extension) {
    throw new ApiError(400, "Unsupported file type.", {
      code: "UPLOAD_UNSUPPORTED_TYPE",
    });
  }
  storageValidationService.assertNotExecutable(extension);

  const normalizedFolder = storageValidationService.assertAllowedFolder(folder);
  const objectKey = digitalOceanSpaces.buildObjectKey({
    prefix: normalizedFolder,
    extension,
    isTemporary:
      normalizedFolder.startsWith("temporary") ||
      normalizedFolder.endsWith("/temp"),
  });
  const signed = await digitalOceanSpaces.generateSignedUploadUrl({
    bucket,
    key: objectKey,
    contentType: mimeType,
    expiresInSeconds: parseExpiresIn(expiresInSeconds, 900),
  });

  return {
    folder: normalizedFolder,
    storageKey: objectKey,
    bucket,
    mimeType,
    fileType,
    extension,
    uploadUrl: signed.url,
    uploadUrlExpiresAt: signed.expiresAt,
    publicUrl: digitalOceanSpaces.computePublicUrl({ bucket, objectKey }),
  };
};

const generateSignedDownloadUrl = async ({
  storageKey,
  expiresInSeconds = 900,
} = {}) => {
  const bucket = environment.integrations.digitalOceanSpaces.bucket;
  if (!bucket) {
    throw new ApiError(500, "Storage is not configured.", {
      code: "STORAGE_NOT_CONFIGURED",
    });
  }
  if (!storageKey) {
    throw new ApiError(400, "storageKey is required.", {
      code: "STORAGE_KEY_REQUIRED",
    });
  }

  const signed = await digitalOceanSpaces.generateSignedDownloadUrl({
    bucket,
    key: storageKey,
    expiresInSeconds: parseExpiresIn(expiresInSeconds, 900),
  });
  return { downloadUrl: signed.url, downloadUrlExpiresAt: signed.expiresAt };
};

const signedUrlService = Object.freeze({
  generateSignedUploadUrl,
  generateSignedDownloadUrl,
});

export default signedUrlService;
