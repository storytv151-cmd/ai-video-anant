import ApiError from '../../utils/ApiError.js';
import environment from '../../config/environment.js';
import digitalOceanSpaces from './digitalOceanSpaces.js';

const requireBucket = () => {
  const bucket = environment.integrations.digitalOceanSpaces.bucket;
  if (!bucket) {
    throw new ApiError(500, 'Storage is not configured.', { code: 'STORAGE_NOT_CONFIGURED' });
  }
  return bucket;
};

const uploadBuffer = async ({ storageKey, buffer, mimeType, metadata = {}, cacheControl = null } = {}) => {
  const bucket = requireBucket();
  const res = await digitalOceanSpaces.uploadFile({
    bucket,
    key: storageKey,
    body: buffer,
    contentType: mimeType,
    metadata,
    cacheControl,
  });
  return { bucket: res.bucket, storageKey: res.key, publicUrl: res.publicUrl };
};

const deleteByKey = async ({ storageKey } = {}) => {
  const bucket = requireBucket();
  await digitalOceanSpaces.deleteFile({ bucket, key: storageKey });
  return { deleted: true };
};

const copy = async ({ sourceKey, destinationKey } = {}) => {
  const bucket = requireBucket();
  const res = await digitalOceanSpaces.copyFile({ bucket, sourceKey, destinationKey });
  return { bucket: res.bucket, storageKey: res.key, publicUrl: res.publicUrl };
};

const move = async ({ sourceKey, destinationKey } = {}) => {
  const bucket = requireBucket();
  const res = await digitalOceanSpaces.moveFile({ bucket, sourceKey, destinationKey });
  return { bucket: res.bucket, storageKey: res.key, publicUrl: res.publicUrl };
};

const generateSignedUploadUrl = async ({ storageKey, mimeType, expiresInSeconds = 900 } = {}) => {
  const bucket = requireBucket();
  const signed = await digitalOceanSpaces.generateSignedUploadUrl({ bucket, key: storageKey, contentType: mimeType, expiresInSeconds });
  return { uploadUrl: signed.url, uploadUrlExpiresAt: signed.expiresAt };
};

const generateSignedDownloadUrl = async ({ storageKey, expiresInSeconds = 900 } = {}) => {
  const bucket = requireBucket();
  const signed = await digitalOceanSpaces.generateSignedDownloadUrl({ bucket, key: storageKey, expiresInSeconds });
  return { downloadUrl: signed.url, downloadUrlExpiresAt: signed.expiresAt };
};

const getPublicUrl = ({ storageKey }) => {
  const bucket = requireBucket();
  return digitalOceanSpaces.computePublicUrl({ bucket, objectKey: storageKey });
};

const storageService = Object.freeze({
  uploadBuffer,
  deleteByKey,
  copy,
  move,
  generateSignedUploadUrl,
  generateSignedDownloadUrl,
  getPublicUrl,
});

export default storageService;

