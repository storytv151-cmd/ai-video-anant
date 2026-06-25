import ApiError from '../../utils/ApiError.js';

const assertVideoBuffer = async (buffer, mimeType) => {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new ApiError(400, 'Invalid video file.', { code: 'UPLOAD_VIDEO_INVALID' });
  }
  if (!mimeType || !String(mimeType).startsWith('video/')) {
    throw new ApiError(400, 'Invalid video MIME type.', { code: 'UPLOAD_UNSUPPORTED_TYPE' });
  }
  return true;
};

const extractVideoMetadataPlaceholder = async () => ({
  durationSeconds: null,
  resolution: null,
});

const videoStorageService = Object.freeze({
  assertVideoBuffer,
  extractVideoMetadataPlaceholder,
});

export default videoStorageService;

