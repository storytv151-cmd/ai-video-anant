import ApiError from "../../utils/ApiError.js";
import { applicationLogger as infoLogger } from "../../config/logger.js";
import AppSettingModel from "../../models/AppSetting.js";
import FileAssetModel from "../../models/FileAsset.js";
import environment from "../../config/environment.js";
import digitalOceanSpaces from "./digitalOceanSpaces.js";
import imageProcessingService from "./imageProcessingService.js";
import storageService from "./storageService.js";
import storageValidationService from "./storageValidationService.js";
import videoStorageService from "./videoStorageService.js";

const safeString = (value, max = 200) => {
  if (value === undefined || value === null) {
    return null;
  }
  const s = String(value);
  return s.length > max ? s.slice(0, max) : s;
};

const pickLimits = async ({ fileType }) => {
  const maxImageBytes = 10 * 1024 * 1024;
  const maxVideoBytes = 250 * 1024 * 1024;

  const settings = await AppSettingModel.findOne({
    section: "STORAGE",
    key: "global",
  }).lean();
  const uploadLimits =
    settings?.uploadLimits || settings?.storageSettings?.uploadLimits || {};

  if (fileType === "image") {
    const mb = Number(uploadLimits.maxImageSizeMB);
    return {
      maxBytes:
        Number.isFinite(mb) && mb > 0 ? mb * 1024 * 1024 : maxImageBytes,
      allowedMimeTypes: Array.isArray(uploadLimits.allowedMimeTypes)
        ? uploadLimits.allowedMimeTypes
        : [],
    };
  }

  if (fileType === "video") {
    const mb = Number(uploadLimits.maxVideoSizeMB);
    return {
      maxBytes:
        Number.isFinite(mb) && mb > 0 ? mb * 1024 * 1024 : maxVideoBytes,
      allowedMimeTypes: Array.isArray(uploadLimits.allowedVideoMimeTypes)
        ? uploadLimits.allowedVideoMimeTypes
        : [],
    };
  }

  return { maxBytes: maxImageBytes, allowedMimeTypes: [] };
};

const resolveFolderForEndpoint = ({ endpointType, folderOverride }) => {
  if (folderOverride) {
    return storageValidationService.assertAllowedFolder(folderOverride);
  }

  switch (endpointType) {
    case "profile":
      return storageValidationService.FOLDERS.USERS_PROFILE;
    case "banner":
      return storageValidationService.FOLDERS.ADMIN_BANNER;
    case "video":
      return storageValidationService.FOLDERS.TEMPORARY;
    case "image":
    default:
      return storageValidationService.FOLDERS.TEMPORARY;
  }
};

const isTemporaryFolder = (folder) => {
  const f = String(folder || "").trim();
  return (
    f === "temporary" ||
    f.endsWith("/temp") ||
    f.endsWith("/temporary") ||
    f.startsWith("temporary/")
  );
};

const resolveOwnerType = (value) => safeString(value || "User", 50) || "User";

const createAssetDoc = async ({
  userId,
  ownerId,
  ownerType,
  folder,
  storageKey,
  bucket,
  publicUrl,
  fileType,
  extension,
  mimeType,
  sizeInBytes,
  width,
  height,
  durationSeconds,
  metadata,
  status,
} = {}) => {
  const docs = await FileAssetModel.create([
    {
      owner: ownerId || userId,
      ownerType: ownerType || "User",
      folder,
      storageKey,
      bucket,
      publicUrl,
      fileType,
      extension,
      mimeType,
      sizeInBytes: Number(sizeInBytes) || 0,
      width: width ?? null,
      height: height ?? null,
      durationSeconds: durationSeconds ?? null,
      metadata: metadata || {},
      status: status || "Ready",
      createdBy: userId,
    },
  ]);
  return docs[0];
};

const buildResponse = (doc, extra = {}) => ({
  fileId: doc._id,
  storageKey: doc.storageKey,
  publicUrl: doc.publicUrl,
  mimeType: doc.mimeType,
  fileType: doc.fileType,
  extension: doc.extension,
  sizeInBytes: doc.sizeInBytes,
  width: doc.width,
  height: doc.height,
  durationSeconds: doc.durationSeconds,
  createdAt: doc.createdAt,
  checksum: doc.checksum || null,
  ...extra,
});

const uploadImage = async ({
  userId,
  file,
  body = {},
  endpointType = "image",
} = {}) => {
  if (!userId) {
    throw new ApiError(401, "Authentication required.", {
      code: "AUTH_REQUIRED",
    });
  }
  if (!file?.buffer) {
    throw new ApiError(400, "File is required.", {
      code: "UPLOAD_FILE_REQUIRED",
    });
  }

  const folder = resolveFolderForEndpoint({
    endpointType,
    folderOverride: body.folder,
  });
  const ownerType = resolveOwnerType(body.ownerType);
  const ownerId = body.ownerId || null;

  const { maxBytes, allowedMimeTypes } = await pickLimits({
    fileType: "image",
  });
  storageValidationService.assertSizeLimit({
    sizeInBytes: file.size,
    maxBytes,
  });
  storageValidationService.assertAllowedMimeType({
    mimeType: file.mimetype,
    allowed: allowedMimeTypes,
  });
  await storageValidationService.virusScanPlaceholder();
  await storageValidationService.duplicateDetectionPlaceholder();

  const processed = await imageProcessingService.processImage({
    buffer: file.buffer,
    maxWidth: endpointType === "profile" ? 1024 : 2048,
    maxHeight: endpointType === "profile" ? 1024 : 2048,
    quality: 82,
    format: "jpeg",
  });

  const extension =
    storageValidationService.resolveExtensionForMimeType({
      mimeType: processed.mimeType,
      fileType: "image",
    }) || "jpg";
  storageValidationService.assertNotExecutable(extension);

  const storageKey = environment.integrations.digitalOceanSpaces.bucket
    ? digitalOceanSpaces.buildObjectKey({
        prefix: folder,
        extension,
        isTemporary: isTemporaryFolder(folder),
      })
    : null;

  if (!storageKey) {
    throw new ApiError(500, "Storage is not configured.", {
      code: "STORAGE_NOT_CONFIGURED",
    });
  }

  const uploaded = await storageService.uploadBuffer({
    storageKey,
    buffer: processed.buffer,
    mimeType: processed.mimeType,
    metadata: { originalFilename: safeString(file.originalname, 200) || null },
    cacheControl:
      endpointType === "profile"
        ? "private, max-age=3600"
        : "public, max-age=31536000, immutable",
  });

  const doc = await createAssetDoc({
    userId,
    ownerId,
    ownerType,
    folder,
    storageKey: uploaded.storageKey,
    bucket: uploaded.bucket,
    publicUrl: uploaded.publicUrl,
    fileType: "image",
    extension,
    mimeType: processed.mimeType,
    sizeInBytes: processed.sizeInBytes,
    width: processed.width,
    height: processed.height,
    durationSeconds: null,
    metadata: { originalFilename: safeString(file.originalname, 200) || null },
    status: isTemporaryFolder(folder) ? "Temporary" : "Ready",
  });

  infoLogger.info("Upload image stored.", {
    fileId: String(doc._id),
    folder,
    storageKey: doc.storageKey,
  });
  return buildResponse(doc);
};

const uploadVideo = async ({
  userId,
  file,
  body = {},
  endpointType = "video",
} = {}) => {
  if (!userId) {
    throw new ApiError(401, "Authentication required.", {
      code: "AUTH_REQUIRED",
    });
  }
  if (!file?.buffer) {
    throw new ApiError(400, "File is required.", {
      code: "UPLOAD_FILE_REQUIRED",
    });
  }

  const folder = resolveFolderForEndpoint({
    endpointType,
    folderOverride: body.folder,
  });
  const ownerType = resolveOwnerType(body.ownerType);
  const ownerId = body.ownerId || null;

  const { maxBytes, allowedMimeTypes } = await pickLimits({
    fileType: "video",
  });
  storageValidationService.assertSizeLimit({
    sizeInBytes: file.size,
    maxBytes,
  });
  storageValidationService.assertAllowedMimeType({
    mimeType: file.mimetype,
    allowed: allowedMimeTypes,
  });
  await storageValidationService.virusScanPlaceholder();
  await storageValidationService.duplicateDetectionPlaceholder();
  await videoStorageService.assertVideoBuffer(file.buffer, file.mimetype);

  const extension =
    storageValidationService.resolveExtensionForMimeType({
      mimeType: file.mimetype,
      fileType: "video",
    }) || "mp4";
  storageValidationService.assertNotExecutable(extension);

  const storageKey = digitalOceanSpaces.buildObjectKey({
    prefix: folder,
    extension,
    isTemporary: isTemporaryFolder(folder),
  });

  const uploaded = await storageService.uploadBuffer({
    storageKey,
    buffer: file.buffer,
    mimeType: file.mimetype,
    metadata: { originalFilename: safeString(file.originalname, 200) || null },
    cacheControl: "private, max-age=3600",
  });

  const meta = await videoStorageService.extractVideoMetadataPlaceholder(
    file.buffer,
  );

  const doc = await createAssetDoc({
    userId,
    ownerId,
    ownerType,
    folder,
    storageKey: uploaded.storageKey,
    bucket: uploaded.bucket,
    publicUrl: uploaded.publicUrl,
    fileType: "video",
    extension,
    mimeType: file.mimetype,
    sizeInBytes: file.size,
    width: null,
    height: null,
    durationSeconds: meta.durationSeconds,
    metadata: { originalFilename: safeString(file.originalname, 200) || null },
    status: isTemporaryFolder(folder) ? "Temporary" : "Ready",
  });

  infoLogger.info("Upload video stored.", {
    fileId: String(doc._id),
    folder,
    storageKey: doc.storageKey,
  });
  return buildResponse(doc);
};

const deleteAsset = async ({ userId, fileId } = {}) => {
  if (!userId) {
    throw new ApiError(401, "Authentication required.", {
      code: "AUTH_REQUIRED",
    });
  }
  if (!fileId) {
    throw new ApiError(400, "fileId is required.", {
      code: "FILE_ID_REQUIRED",
    });
  }

  const doc = await FileAssetModel.findOne({ _id: fileId, isDeleted: false });
  if (!doc) {
    throw new ApiError(404, "File not found.", { code: "FILE_NOT_FOUND" });
  }

  if (String(doc.owner || "") !== String(userId)) {
    throw new ApiError(403, "Access denied.", { code: "ACCESS_DENIED" });
  }

  await storageService.deleteByKey({ storageKey: doc.storageKey });
  doc.status = "Deleted";
  doc.isDeleted = true;
  doc.deletedAt = new Date();
  doc.deletedBy = userId;
  await doc.save();

  infoLogger.info("File deleted.", {
    fileId: String(doc._id),
    storageKey: doc.storageKey,
  });
  return { deleted: true, fileId: doc._id };
};

const uploadService = Object.freeze({
  uploadImage,
  uploadVideo,
  deleteAsset,
});

export default uploadService;
