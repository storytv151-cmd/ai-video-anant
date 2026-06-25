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
    if (lower.endsWith('.mp4')) {
      return 'video/mp4';
    }
    if (lower.endsWith('.webm')) {
      return 'video/webm';
    }
    if (lower.endsWith('.mov')) {
      return 'video/quicktime';
    }
    if (lower.endsWith('.mp3')) {
      return 'audio/mpeg';
    }
    if (lower.endsWith('.wav')) {
      return 'audio/wav';
    }
    if (lower.endsWith('.m4a')) {
      return 'audio/mp4';
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

const validateMediaAssets = ({ assets, requiredCount = null, maxCount = null, maxSizeBytes = null, allowedMimeTypes = [], storageSettings, itemLabel = 'Asset' }) => {
  const items = Array.isArray(assets) ? assets : [];
  if (requiredCount !== null && items.length < requiredCount) {
    throw new ApiError(400, `${itemLabel} count is below the required minimum.`, { code: 'INVALID_MEDIA_COUNT' });
  }
  if (maxCount !== null && maxCount > 0 && items.length > maxCount) {
    throw new ApiError(400, `Too many ${itemLabel.toLowerCase()}s provided.`, { code: 'UPLOAD_MEDIA_COUNT_LIMIT' });
  }

  const cdnBaseUrl = normalizeCdnBaseUrl(storageSettings?.cdnBaseUrl);

  for (let i = 0; i < items.length; i += 1) {
    const asset = items[i] || {};
    if (!asset.url) {
      throw new ApiError(400, `${itemLabel} URL is required.`, { code: 'MEDIA_URL_REQUIRED' });
    }

    assertUrlAllowed({ url: asset.url, cdnBaseUrl, storageSettings });

    const inferredMime = inferMimeTypeFromUrl(String(asset.url).trim());
    if (!inferredMime) {
      throw new ApiError(400, 'Unsupported media extension.', { code: 'UNSUPPORTED_MEDIA_EXTENSION' });
    }

    if (asset.mimeType && String(asset.mimeType).trim() !== inferredMime) {
      throw new ApiError(400, 'Invalid media MIME type.', { code: 'UNSUPPORTED_MEDIA_TYPE' });
    }

    const mimeToCheck = asset.mimeType || inferredMime;
    if (allowedMimeTypes.length > 0 && mimeToCheck && !allowedMimeTypes.includes(mimeToCheck)) {
      throw new ApiError(400, 'Unsupported media type.', { code: 'UNSUPPORTED_MEDIA_TYPE' });
    }

    if (maxSizeBytes !== null) {
      const provided = asset.sizeInBytes !== null && asset.sizeInBytes !== undefined;
      if (environment.runtime.isProduction && !provided) {
        throw new ApiError(400, 'Media size metadata is required.', { code: 'MEDIA_SIZE_REQUIRED' });
      }
      if (provided) {
        const size = Number(asset.sizeInBytes);
        if (!Number.isFinite(size) || size < 0 || size > maxSizeBytes) {
          throw new ApiError(400, 'Media size exceeds configured limit.', { code: 'MEDIA_SIZE_LIMIT' });
        }
      }
    }

    if (environment.runtime.isProduction && !asset.storageKey) {
      throw new ApiError(400, 'Media storageKey is required.', { code: 'MEDIA_STORAGE_KEY_REQUIRED' });
    }
  }

  return items.map((asset, idx) => ({
    url: String(asset.url).trim(),
    storageKey: asset.storageKey || null,
    mimeType: asset.mimeType || inferMimeTypeFromUrl(String(asset.url).trim()) || null,
    width: asset.width ?? null,
    height: asset.height ?? null,
    sizeInBytes: asset.sizeInBytes ?? null,
    durationSeconds: asset.durationSeconds ?? null,
    isPrimary: Boolean(asset.isPrimary ?? idx === 0),
    uploadedAt: asset.uploadedAt ? new Date(asset.uploadedAt) : new Date(),
  }));
};

const validateInputImages = ({ inputImages, requiredImages, uploadLimits, storageSettings, minimumImages = null, maximumImages = null }) => {
  const minRequired = minimumImages ?? (Number.isFinite(Number(requiredImages)) ? Number(requiredImages) : null);
  const maxCount = maximumImages ?? (Number.isFinite(Number(uploadLimits?.maxImageCount)) ? Number(uploadLimits.maxImageCount) : null);
  const maxSizeBytes =
    Number.isFinite(Number(uploadLimits?.maxImageSizeMB)) && Number(uploadLimits.maxImageSizeMB) > 0
      ? Number(uploadLimits.maxImageSizeMB) * 1024 * 1024
      : null;
  const allowedMimeTypes = Array.isArray(uploadLimits?.allowedMimeTypes) ? uploadLimits.allowedMimeTypes : [];

  return validateMediaAssets({
    assets: inputImages,
    requiredCount: minRequired,
    maxCount,
    maxSizeBytes,
    allowedMimeTypes,
    storageSettings,
    itemLabel: 'Image',
  });
};

const validateInputVideos = ({ inputVideos, uploadLimits, storageSettings }) =>
  validateMediaAssets({
    assets: inputVideos,
    requiredCount: null,
    maxCount:
      Number.isFinite(Number(uploadLimits?.maxVideoCount)) && Number(uploadLimits.maxVideoCount) > 0
        ? Number(uploadLimits.maxVideoCount)
        : 5,
    maxSizeBytes:
      Number.isFinite(Number(uploadLimits?.maxVideoSizeMB)) && Number(uploadLimits.maxVideoSizeMB) > 0
        ? Number(uploadLimits.maxVideoSizeMB) * 1024 * 1024
        : null,
    allowedMimeTypes: Array.isArray(uploadLimits?.allowedVideoMimeTypes) ? uploadLimits.allowedVideoMimeTypes : [],
    storageSettings,
    itemLabel: 'Video',
  });

const validateInputAudio = ({ inputAudio, uploadLimits, storageSettings }) =>
  validateMediaAssets({
    assets: inputAudio,
    requiredCount: null,
    maxCount:
      Number.isFinite(Number(uploadLimits?.maxAudioCount)) && Number(uploadLimits.maxAudioCount) > 0
        ? Number(uploadLimits.maxAudioCount)
        : 5,
    maxSizeBytes:
      Number.isFinite(Number(uploadLimits?.maxAudioSizeMB)) && Number(uploadLimits.maxAudioSizeMB) > 0
        ? Number(uploadLimits.maxAudioSizeMB) * 1024 * 1024
        : null,
    allowedMimeTypes: Array.isArray(uploadLimits?.allowedAudioMimeTypes) ? uploadLimits.allowedAudioMimeTypes : [],
    storageSettings,
    itemLabel: 'Audio',
  });

const generationStorageService = Object.freeze({
  validateInputImages,
  validateInputVideos,
  validateInputAudio,
  validateMediaAssets,
});

export default generationStorageService;
