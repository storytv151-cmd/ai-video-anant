import crypto from "node:crypto";
import {
  S3Client,
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import environment from "../../config/environment.js";

const normalizeKeyPart = (value) =>
  String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

const buildFolderPrefix = ({ kind, isTemporary }) => {
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const base = isTemporary ? "tmp" : "perm";
  const k = normalizeKeyPart(kind) || "asset";
  return `${base}/${k}/${yyyy}/${mm}/${dd}`;
};

const buildObjectKey = ({
  kind = "asset",
  extension = "",
  isTemporary = true,
  prefix = null,
} = {}) => {
  const ext = String(extension || "")
    .trim()
    .toLowerCase();
  const safeExt = ext && ext.startsWith(".") ? ext : ext ? `.${ext}` : "";
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
  const isEndpointHost =
    u.host === endpointHost || u.host.endsWith(`.${endpointHost}`);
  const isCdnHost = cdn ? u.host === new URL(cdn).host : false;

  if (!isEndpointHost && !isCdnHost) {
    return null;
  }

  const parts = String(u.pathname || "")
    .split("/")
    .filter(Boolean);

  if (isEndpointHost && u.host !== endpointHost) {
    const bucketFromHost = u.host.slice(
      0,
      u.host.length - (endpointHost.length + 1),
    );
    if (bucketFromHost !== bucket) {
      return null;
    }
    return { bucket, objectKey: parts.join("/") || null };
  }

  if (isEndpointHost && parts[0] === bucket) {
    return { bucket, objectKey: parts.slice(1).join("/") || null };
  }

  if (isCdnHost) {
    return { bucket, objectKey: parts.join("/") || null };
  }

  return null;
};

const getClient = () => {
  const { key, secret, endpoint, region } =
    environment.integrations.digitalOceanSpaces;
  const cfg = {
    region: region || "us-east-1",
    endpoint,
    credentials: {
      accessKeyId: key,
      secretAccessKey: secret,
    },
    forcePathStyle: true,
  };
  return new S3Client(cfg);
};

const computePublicUrl = ({ bucket, objectKey }) => {
  const cdn = environment.integrations.digitalOceanSpaces.cdn;
  if (cdn) {
    const base = cdn.endsWith("/") ? cdn.slice(0, -1) : cdn;
    return `${base}/${String(objectKey).replace(/^\/+/, "")}`;
  }
  const endpoint = environment.integrations.digitalOceanSpaces.endpoint;
  const base = endpoint.endsWith("/") ? endpoint.slice(0, -1) : endpoint;
  return `${base}/${bucket}/${String(objectKey).replace(/^\/+/, "")}`;
};

const uploadFile = async ({
  bucket,
  key,
  body,
  contentType,
  metadata = {},
  cacheControl = null,
} = {}) => {
  const client = getClient();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType || undefined,
    CacheControl: cacheControl || undefined,
    ACL: "private",
    Metadata: metadata || undefined,
  });
  await client.send(command);
  return {
    bucket,
    key,
    publicUrl: computePublicUrl({ bucket, objectKey: key }),
  };
};

const deleteFile = async ({ bucket, key } = {}) => {
  const client = getClient();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  return { deleted: true };
};

const copyFile = async ({ bucket, sourceKey, destinationKey } = {}) => {
  const client = getClient();
  const normalized = String(sourceKey).replace(/^\/+/, "");
  const copyKey = normalized
    .split("/")
    .map((p) => encodeURIComponent(p))
    .join("/");
  const copySource = `/${bucket}/${copyKey}`;
  await client.send(
    new CopyObjectCommand({
      Bucket: bucket,
      Key: destinationKey,
      CopySource: copySource,
      ACL: "private",
      MetadataDirective: "COPY",
    }),
  );
  return {
    bucket,
    key: destinationKey,
    publicUrl: computePublicUrl({ bucket, objectKey: destinationKey }),
  };
};

const moveFile = async ({ bucket, sourceKey, destinationKey } = {}) => {
  const copied = await copyFile({ bucket, sourceKey, destinationKey });
  await deleteFile({ bucket, key: sourceKey });
  return copied;
};

const fileExists = async ({ bucket, key } = {}) => {
  const client = getClient();
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
};

const getMetadata = async ({ bucket, key } = {}) => {
  const client = getClient();
  const res = await client.send(
    new HeadObjectCommand({ Bucket: bucket, Key: key }),
  );
  return {
    contentType: res.ContentType || null,
    contentLength: res.ContentLength ?? null,
    eTag: res.ETag || null,
    metadata: res.Metadata || {},
    lastModified: res.LastModified || null,
  };
};

const generateSignedUploadUrl = async ({
  bucket,
  key,
  contentType,
  expiresInSeconds = 900,
} = {}) => {
  const client = getClient();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType || undefined,
    ACL: "private",
  });
  const url = await getSignedUrl(client, command, {
    expiresIn: Number(expiresInSeconds),
  });
  return {
    url,
    expiresAt: new Date(Date.now() + Number(expiresInSeconds) * 1000),
  };
};

const generateSignedDownloadUrl = async ({
  bucket,
  key,
  expiresInSeconds = 900,
} = {}) => {
  const client = getClient();
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const url = await getSignedUrl(client, command, {
    expiresIn: Number(expiresInSeconds),
  });
  return {
    url,
    expiresAt: new Date(Date.now() + Number(expiresInSeconds) * 1000),
  };
};

const digitalOceanSpaces = Object.freeze({
  name: "digitalocean-spaces",
  status: "ready",
  buildObjectKey,
  parseSpacesPublicUrl,
  computePublicUrl,
  uploadFile,
  deleteFile,
  moveFile,
  copyFile,
  generateSignedUploadUrl,
  generateSignedDownloadUrl,
  fileExists,
  getMetadata,
});

export default digitalOceanSpaces;
