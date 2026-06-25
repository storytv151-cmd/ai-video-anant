import ApiError from '../../utils/ApiError.js';
import validator from 'validator';
import environment from '../../config/environment.js';

const normalizeCdnBaseUrl = (value) => {
  if (!value) {
    return null;
  }
  const trimmed = String(value).trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
};

const inferMimeTypeFromUrl = (urlString) => {
  try {
    const u = new URL(urlString);
    const pathname = u.pathname || '';
    const lower = pathname.toLowerCase();
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
      return 'image/jpeg';
    }
    if (lower.endsWith('.png')) {
      return 'image/png';
    }
    if (lower.endsWith('.webp')) {
      return 'image/webp';
    }
    if (lower.endsWith('.gif')) {
      return 'image/gif';
    }
    return null;
  } catch {
    return null;
  }
};

const isAllowedSpacesUrl = ({ urlString, bucket, endpoint, cdnBaseUrl }) => {
  if (!bucket) {
    return false;
  }

  const normalizedCdn = normalizeCdnBaseUrl(cdnBaseUrl);
  if (normalizedCdn && String(urlString).startsWith(normalizedCdn)) {
    return true;
  }

  if (!endpoint) {
    return false;
  }

  const u = new URL(urlString);
  const endpointHost = new URL(endpoint).host;
  if (u.host !== endpointHost && !u.host.endsWith(`.${endpointHost}`)) {
    return false;
  }

  const hostPrefix = u.host === endpointHost ? null : u.host.slice(0, u.host.length - (endpointHost.length + 1));
  if (hostPrefix && hostPrefix === bucket) {
    return true;
  }

  const parts = String(u.pathname || '')
    .split('/')
    .filter(Boolean);
  if (parts.length > 0 && parts[0] === bucket) {
    return true;
  }

  return false;
};

const assertUrlAllowed = ({ url, cdnBaseUrl, storageSettings }) => {
  const stringUrl = String(url || '').trim();
  if (!validator.isURL(stringUrl, { require_protocol: true })) {
    throw new ApiError(400, 'Invalid image URL.', { code: 'INVALID_IMAGE_URL' });
  }

  const bucket = environment.integrations.digitalOceanSpaces.bucket;
  const endpoint = environment.integrations.digitalOceanSpaces.endpoint;
  const allowedCdn = storageSettings?.cdnBaseUrl || cdnBaseUrl || environment.integrations.digitalOceanSpaces.cdn || null;

  if (environment.runtime.isProduction) {
    if (!bucket || !endpoint) {
      throw new ApiError(500, 'Storage is not configured.', { code: 'STORAGE_NOT_CONFIGURED' });
    }
    if (!isAllowedSpacesUrl({ urlString: stringUrl, bucket, endpoint, cdnBaseUrl: allowedCdn })) {
      throw new ApiError(400, 'Image URL is not allowed.', { code: 'STORAGE_URL_INVALID' });
    }
  } else if (cdnBaseUrl && !stringUrl.startsWith(cdnBaseUrl)) {
    throw new ApiError(400, 'Image URL must use configured storage CDN base URL.', { code: 'STORAGE_URL_INVALID' });
  }
};

const validateInputImages = ({ inputImages, requiredImages, uploadLimits, storageSettings }) => {
  const images = Array.isArray(inputImages) ? inputImages : [];
  const expected = Number.isFinite(Number(requiredImages)) ? Number(requiredImages) : null;

  if (expected !== null && images.length !== expected) {
    throw new ApiError(400, `Exactly ${expected} image(s) are required for this template.`, {
      code: 'INVALID_IMAGE_COUNT',
    });
  }

  const maxCount = Number.isFinite(Number(uploadLimits?.maxImageCount)) ? Number(uploadLimits.maxImageCount) : null;
  if (maxCount !== null && maxCount > 0 && images.length > maxCount) {
    throw new ApiError(400, 'Too many images provided.', { code: 'UPLOAD_IMAGE_COUNT_LIMIT' });
  }

  const maxSizeBytes =
    Number.isFinite(Number(uploadLimits?.maxImageSizeMB)) && Number(uploadLimits.maxImageSizeMB) > 0
      ? Number(uploadLimits.maxImageSizeMB) * 1024 * 1024
      : null;

  const allowedMimeTypes = Array.isArray(uploadLimits?.allowedMimeTypes) ? uploadLimits.allowedMimeTypes : [];
  const cdnBaseUrl = normalizeCdnBaseUrl(storageSettings?.cdnBaseUrl);

  for (let i = 0; i < images.length; i += 1) {
    const img = images[i] || {};
    if (!img.url) {
      throw new ApiError(400, 'Image URL is required.', { code: 'IMAGE_URL_REQUIRED' });
    }

    assertUrlAllowed({ url: img.url, cdnBaseUrl, storageSettings });

    const inferredMime = inferMimeTypeFromUrl(String(img.url).trim());
    if (!inferredMime) {
      throw new ApiError(400, 'Unsupported image extension.', { code: 'UNSUPPORTED_IMAGE_EXTENSION' });
    }

    if (img.mimeType && String(img.mimeType).trim() !== inferredMime) {
      throw new ApiError(400, 'Invalid image MIME type.', { code: 'UNSUPPORTED_IMAGE_TYPE' });
    }

    const mimeToCheck = img.mimeType || inferredMime;
    if (allowedMimeTypes.length > 0 && mimeToCheck && !allowedMimeTypes.includes(mimeToCheck)) {
      throw new ApiError(400, 'Unsupported image type.', { code: 'UNSUPPORTED_IMAGE_TYPE' });
    }

    if (maxSizeBytes !== null) {
      const provided = img.sizeInBytes !== null && img.sizeInBytes !== undefined;
      if (environment.runtime.isProduction && !provided) {
        throw new ApiError(400, 'Image size metadata is required.', { code: 'IMAGE_SIZE_REQUIRED' });
      }
      if (provided) {
        const size = Number(img.sizeInBytes);
        if (!Number.isFinite(size) || size < 0 || size > maxSizeBytes) {
          throw new ApiError(400, 'Image size exceeds configured limit.', { code: 'IMAGE_SIZE_LIMIT' });
        }
      }
    }

    if (environment.runtime.isProduction && !img.storageKey) {
      throw new ApiError(400, 'Image storageKey is required.', { code: 'IMAGE_STORAGE_KEY_REQUIRED' });
    }
  }

  return images.map((img, idx) => ({
    url: String(img.url).trim(),
    storageKey: img.storageKey || null,
    mimeType: img.mimeType || inferMimeTypeFromUrl(String(img.url).trim()) || null,
    width: img.width ?? null,
    height: img.height ?? null,
    sizeInBytes: img.sizeInBytes ?? null,
    isPrimary: Boolean(img.isPrimary ?? idx === 0),
    uploadedAt: img.uploadedAt ? new Date(img.uploadedAt) : new Date(),
  }));
};

const generationStorageService = Object.freeze({
  validateInputImages,
});

export default generationStorageService;
