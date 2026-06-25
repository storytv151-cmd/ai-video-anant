import ApiError from '../utils/ApiError.js';
import { formatSuccessResponse } from '../utils/responseFormatter.js';
import FileAssetModel from '../models/FileAsset.js';
import signedUrlService from '../services/storage/signedUrlService.js';
import uploadService from '../services/storage/uploadService.js';

const uploadImage = async (request, response) => {
  const data = await uploadService.uploadImage({
    userId: request.user?.id,
    file: request.file,
    body: request.body,
    endpointType: 'image',
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const uploadProfile = async (request, response) => {
  const data = await uploadService.uploadImage({
    userId: request.user?.id,
    file: request.file,
    body: request.body,
    endpointType: 'profile',
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const uploadBanner = async (request, response) => {
  const data = await uploadService.uploadImage({
    userId: request.user?.id,
    file: request.file,
    body: request.body,
    endpointType: 'banner',
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const uploadVideo = async (request, response) => {
  const data = await uploadService.uploadVideo({
    userId: request.user?.id,
    file: request.file,
    body: request.body,
    endpointType: 'video',
  });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const deleteFile = async (request, response) => {
  const data = await uploadService.deleteAsset({ userId: request.user?.id, fileId: request.params.fileId });
  response.status(200).json(formatSuccessResponse({ statusCode: 200, data }));
};

const getSignedUrl = async (request, response) => {
  if (!request.user?.id) {
    throw new ApiError(401, 'Authentication required.', { code: 'AUTH_REQUIRED' });
  }

  const operation = String(request.query.operation || 'upload').toLowerCase();
  const expiresInSeconds = request.query.expiresInSeconds;

  if (operation === 'download') {
    const fileId = request.query.fileId;
    if (!fileId) {
      throw new ApiError(400, 'fileId is required.', { code: 'FILE_ID_REQUIRED' });
    }
    const doc = await FileAssetModel.findOne({ _id: fileId, isDeleted: false }).lean();
    if (!doc) {
      throw new ApiError(404, 'File not found.', { code: 'FILE_NOT_FOUND' });
    }
    if (String(doc.owner || '') !== String(request.user.id)) {
      throw new ApiError(403, 'Access denied.', { code: 'ACCESS_DENIED' });
    }
    const signed = await signedUrlService.generateSignedDownloadUrl({ storageKey: doc.storageKey, expiresInSeconds });
    response.status(200).json(formatSuccessResponse({ statusCode: 200, data: { fileId: doc._id, ...signed } }));
    return;
  }

  const fileType = String(request.query.fileType || '').toLowerCase();
  const folder = request.query.folder;
  const mimeType = request.query.mimeType;

  const normalizedFolder = String(folder || '').trim().replace(/\/+$/g, '');
  if ((normalizedFolder === 'admin' || normalizedFolder.startsWith('admin/')) && request.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized.', { code: 'FORBIDDEN' });
  }
  if ((normalizedFolder === 'system' || normalizedFolder === 'logs') && request.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized.', { code: 'FORBIDDEN' });
  }

  const signed = await signedUrlService.generateSignedUploadUrl({
    folder,
    mimeType,
    fileType,
    expiresInSeconds,
  });
  const doc = await FileAssetModel.create([
    {
      owner: request.user.id,
      ownerType: 'User',
      folder: signed.folder,
      storageKey: signed.storageKey,
      bucket: signed.bucket,
      publicUrl: signed.publicUrl,
      mimeType: signed.mimeType,
      fileType: signed.fileType || fileType,
      extension: signed.extension,
      sizeInBytes: 0,
      status: 'Temporary',
      createdBy: request.user.id,
      metadata: {},
    },
  ]);

  response
    .status(200)
    .json(formatSuccessResponse({ statusCode: 200, data: { ...signed, fileId: doc[0]._id } }));
};

export { uploadImage, uploadVideo, uploadBanner, uploadProfile, deleteFile, getSignedUrl };
