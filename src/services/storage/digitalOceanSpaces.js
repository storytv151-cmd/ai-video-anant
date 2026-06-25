/**
 * DigitalOcean Spaces storage adapter placeholder.
 * S3-compatible storage operations will be implemented in a future phase.
 */
import crypto from 'node:crypto';
import environment from '../../config/environment.js';

const normalizeKeyPart = (value) =>
  String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);

const buildFolderPrefix = ({ kind, isTemporary }) => {
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const base = isTemporary ? 'tmp' : 'perm';
  const k = normalizeKeyPart(kind) || 'asset';
  return `${base}/${k}/${yyyy}/${mm}/${dd}`;
};

const buildObjectKey = ({ kind = 'asset', extension = '', isTemporary = true, prefix = null } = {}) => {
  const ext = String(extension || '').trim().toLowerCase();
  const safeExt = ext && ext.startsWith('.') ? ext : ext ? `.${ext}` : '';
  const folder = prefix || buildFolderPrefix({ kind, isTemporary });
  const id = crypto.randomUUID();
  return `${folder}/${id}${safeExt}`;
};

const parseSpacesPublicUrl = (urlString) => {
  const bucket = environment.integrations.digitalOceanSpaces.bucket;
  const endpoint = environment.integrations.digitalOceanSpaces.endpoint;
  const cdn = environment.integrations.digitalOceanSpaces.cdn;
  if (!bucket || !endpoint) {
    return null;
  }

  const u = new URL(String(urlString));
  const endpointHost = new URL(endpoint).host;
  const isEndpointHost = u.host === endpointHost || u.host.endsWith(`.${endpointHost}`);
  const isCdnHost = cdn ? u.host === new URL(cdn).host : false;

  if (!isEndpointHost && !isCdnHost) {
    return null;
  }

  const parts = String(u.pathname || '')
    .split('/')
    .filter(Boolean);

  if (isEndpointHost && u.host !== endpointHost) {
    const bucketFromHost = u.host.slice(0, u.host.length - (endpointHost.length + 1));
    if (bucketFromHost !== bucket) {
      return null;
    }
    return { bucket, objectKey: parts.join('/') || null };
  }

  if (isEndpointHost && parts[0] === bucket) {
    return { bucket, objectKey: parts.slice(1).join('/') || null };
  }

  if (isCdnHost) {
    return { bucket, objectKey: parts.join('/') || null };
  }

  return null;
};

const signToken = ({ objectKey, expiresAt }) => {
  const secret = environment.security.cookieSecret || environment.integrations.digitalOceanSpaces.secret || '';
  const payload = `${String(objectKey)}.${String(expiresAt)}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return sig;
};

const createSignedUrl = ({ objectKey, expiresInSeconds = 900, method = 'GET' } = {}) => {
  const bucket = environment.integrations.digitalOceanSpaces.bucket;
  const endpoint = environment.integrations.digitalOceanSpaces.endpoint;
  if (!bucket || !endpoint) {
    return null;
  }
  const expiresAt = Math.floor(Date.now() / 1000) + Number(expiresInSeconds);
  const token = signToken({ objectKey, expiresAt });

  const base = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
  const key = String(objectKey || '').replace(/^\/+/, '');
  const url = `${base}/${bucket}/${key}?x-exp=${expiresAt}&x-token=${token}&x-method=${encodeURIComponent(method)}`;
  return { url, expiresAt: new Date(expiresAt * 1000) };
};

const digitalOceanSpaces = Object.freeze({
  name: 'digitalocean-spaces',
  status: 'placeholder',
  buildObjectKey,
  parseSpacesPublicUrl,
  createSignedUploadUrl: ({ objectKey, expiresInSeconds = 900 } = {}) => createSignedUrl({ objectKey, expiresInSeconds, method: 'PUT' }),
  createSignedDownloadUrl: ({ objectKey, expiresInSeconds = 900 } = {}) => createSignedUrl({ objectKey, expiresInSeconds, method: 'GET' }),
});

export default digitalOceanSpaces;
