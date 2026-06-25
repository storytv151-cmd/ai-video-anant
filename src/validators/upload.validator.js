const buildResult = ({ valid = true, message = '', errors = [] } = {}) => ({ valid, message, errors });

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const validateUploadBody = async (body = {}) => {
  const errors = [];
  if (body.folder !== undefined && body.folder !== null && body.folder !== '' && !isNonEmptyString(body.folder)) {
    errors.push({ field: 'folder', message: 'folder must be a string.' });
  }
  if (body.ownerType !== undefined && body.ownerType !== null && body.ownerType !== '' && !isNonEmptyString(body.ownerType)) {
    errors.push({ field: 'ownerType', message: 'ownerType must be a string.' });
  }
  if (errors.length > 0) {
    return buildResult({ valid: false, message: 'Validation failed.', errors });
  }
  return buildResult({ valid: true });
};

const validateSignedUrlQuery = async (query = {}) => {
  const errors = [];
  const operation = query.operation;
  if (operation && !['upload', 'download'].includes(String(operation).toLowerCase())) {
    errors.push({ field: 'operation', message: 'operation must be upload or download.' });
  }

  if (String(operation || '').toLowerCase() === 'download') {
    if (!isNonEmptyString(query.fileId)) {
      errors.push({ field: 'fileId', message: 'fileId is required for download.' });
    }
  } else {
    if (!isNonEmptyString(query.folder)) {
      errors.push({ field: 'folder', message: 'folder is required for upload.' });
    }
    if (!isNonEmptyString(query.fileType)) {
      errors.push({ field: 'fileType', message: 'fileType is required for upload.' });
    }
    if (!isNonEmptyString(query.mimeType)) {
      errors.push({ field: 'mimeType', message: 'mimeType is required for upload.' });
    }
  }

  if (query.expiresInSeconds !== undefined && query.expiresInSeconds !== null && query.expiresInSeconds !== '') {
    const n = Number(query.expiresInSeconds);
    if (!Number.isFinite(n) || n <= 0 || n > 3600) {
      errors.push({ field: 'expiresInSeconds', message: 'expiresInSeconds must be between 1 and 3600.' });
    }
  }

  if (errors.length > 0) {
    return buildResult({ valid: false, message: 'Validation failed.', errors });
  }
  return buildResult({ valid: true });
};

const validateFileIdParam = async (params = {}) => {
  const errors = [];
  if (!isNonEmptyString(params.fileId)) {
    errors.push({ field: 'fileId', message: 'fileId is required.' });
  }
  if (errors.length > 0) {
    return buildResult({ valid: false, message: 'Validation failed.', errors });
  }
  return buildResult({ valid: true });
};

const uploadValidator = Object.freeze({
  validateUploadBody,
  validateSignedUrlQuery,
  validateFileIdParam,
});

export default uploadValidator;

