import ApiError from "../../utils/ApiError.js";

const FOLDERS = Object.freeze({
  USERS: "users",
  USERS_PROFILE: "users/profile",
  USERS_TEMP: "users/temp",
  TEMPLATES: "templates",
  TEMPLATES_IMAGES: "templates/images",
  TEMPLATES_VIDEOS: "templates/videos",
  GENERATION: "generation",
  GENERATION_INPUT: "generation/input",
  GENERATION_OUTPUT: "generation/output",
  GENERATION_THUMBNAILS: "generation/thumbnails",
  ADMIN: "admin",
  ADMIN_BANNER: "admin/banner",
  ADMIN_ASSETS: "admin/assets",
  SYSTEM: "system",
  LOGS: "logs",
  TEMPORARY: "temporary",
});

const ALLOWED_FOLDERS = Object.freeze(new Set(Object.values(FOLDERS)));

const IMAGE_MIME_TO_EXT = Object.freeze({
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
});

const VIDEO_MIME_TO_EXT = Object.freeze({
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
});

const BLOCKED_EXTENSIONS = Object.freeze(
  new Set(["exe", "dll", "bat", "cmd", "sh", "jar", "com", "msi", "js"]),
);

const normalizeFolder = (value) =>
  String(value || "")
    .trim()
    .replace(/\/+$/g, "");

const assertAllowedFolder = (folder) => {
  const normalized = normalizeFolder(folder);
  if (!ALLOWED_FOLDERS.has(normalized)) {
    throw new ApiError(400, "Folder is not allowed.", {
      code: "STORAGE_FOLDER_NOT_ALLOWED",
      details: [{ folder: normalized }],
    });
  }
  return normalized;
};

const normalizeMimeType = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const resolveExtensionForMimeType = ({ mimeType, fileType }) => {
  const mt = normalizeMimeType(mimeType);
  if (fileType === "image") {
    return IMAGE_MIME_TO_EXT[mt] || null;
  }
  if (fileType === "video") {
    return VIDEO_MIME_TO_EXT[mt] || null;
  }
  return null;
};

const assertNotExecutable = (extension) => {
  const ext = String(extension || "")
    .trim()
    .toLowerCase()
    .replace(/^\./, "");
  if (ext && BLOCKED_EXTENSIONS.has(ext)) {
    throw new ApiError(400, "Executable files are not allowed.", {
      code: "STORAGE_EXECUTABLE_BLOCKED",
    });
  }
};

const assertSizeLimit = ({ sizeInBytes, maxBytes }) => {
  const size = Number(sizeInBytes);
  if (!Number.isFinite(size) || size < 0) {
    throw new ApiError(400, "Invalid file size.", {
      code: "UPLOAD_SIZE_INVALID",
    });
  }
  if (Number.isFinite(maxBytes) && maxBytes > 0 && size > maxBytes) {
    throw new ApiError(400, "File size exceeds limit.", {
      code: "UPLOAD_SIZE_LIMIT",
    });
  }
};

const assertAllowedMimeType = ({ mimeType, allowed }) => {
  if (!Array.isArray(allowed) || allowed.length === 0) {
    return;
  }
  const mt = normalizeMimeType(mimeType);
  if (!allowed.includes(mt)) {
    throw new ApiError(400, "Unsupported file type.", {
      code: "UPLOAD_UNSUPPORTED_TYPE",
      details: [{ mimeType: mt }],
    });
  }
};

const virusScanPlaceholder = async () => ({ scanned: false, clean: true });

const duplicateDetectionPlaceholder = async () => ({
  checked: false,
  duplicate: false,
});

const storageValidationService = Object.freeze({
  FOLDERS,
  assertAllowedFolder,
  resolveExtensionForMimeType,
  assertNotExecutable,
  assertSizeLimit,
  assertAllowedMimeType,
  virusScanPlaceholder,
  duplicateDetectionPlaceholder,
});

export default storageValidationService;
