/**
 * Centralized environment loader and validator.
 * This module is the single source of truth for runtime configuration.
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import validator from 'validator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');

dotenv.config({ path: path.join(projectRoot, '.env') });

const parseNumber = (value, fallback) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
};

const parseBoolean = (value, fallback = false) => {
  if (value === undefined) {
    return fallback;
  }

  return String(value).toLowerCase() === 'true';
};

const parseOrigins = (value) => {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const ensureValidUrl = (value, key) => {
  if (!value) {
    return '';
  }

  if (!validator.isURL(value, { require_protocol: true })) {
    throw new Error(`Environment variable ${key} must be a valid URL.`);
  }

  return value;
};

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

const requiredInProduction = ['PORT', 'MONGO_URI'];
const missingVariables = requiredInProduction.filter(
  (key) => isProduction && !process.env[key],
);

if (missingVariables.length > 0) {
  throw new Error(
    `Missing required environment variables in production: ${missingVariables.join(', ')}`,
  );
}

const environment = Object.freeze({
  app: {
    name: process.env.APP_NAME || 'AI Video Generation Platform Backend',
    version: process.env.APP_VERSION || '1.0.0',
    env: nodeEnv,
    port: parseNumber(process.env.PORT, 5000),
    apiBasePath: process.env.API_BASE_PATH || '/api',
    apiVersion: process.env.API_VERSION || 'v1',
    clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
    trustProxy: parseNumber(process.env.TRUST_PROXY, 1),
    bodyLimit: process.env.BODY_LIMIT || '2mb',
    enableHttpLogging: parseBoolean(process.env.ENABLE_HTTP_LOGGING, true),
    enableRequestIdHeader: parseBoolean(process.env.ENABLE_REQUEST_ID_HEADER, true),
  },
  database: {
    uri: process.env.MONGO_URI || '',
    dbName: process.env.MONGO_DB_NAME || 'ai-video-platform',
    minPoolSize: parseNumber(process.env.MONGO_MIN_POOL_SIZE, 5),
    maxPoolSize: parseNumber(process.env.MONGO_MAX_POOL_SIZE, 20),
    socketTimeoutMS: parseNumber(process.env.MONGO_SOCKET_TIMEOUT_MS, 45000),
    serverSelectionTimeoutMS: parseNumber(
      process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS,
      5000,
    ),
  },
  security: {
    jwtSecret: process.env.JWT_SECRET || '',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || '',
    jwtAccessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
    jwtRefreshExpires: process.env.JWT_REFRESH_EXPIRES || '30d',
    cookieSecret: process.env.COOKIE_SECRET || '',
    corsAllowedOrigins: parseOrigins(process.env.CORS_ALLOWED_ORIGINS),
  },
  integrations: {
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    digitalOceanSpaces: {
      key: process.env.DIGITALOCEAN_SPACES_KEY || '',
      secret: process.env.DIGITALOCEAN_SPACES_SECRET || '',
      bucket: process.env.DIGITALOCEAN_SPACES_BUCKET || '',
      region: process.env.DIGITALOCEAN_SPACES_REGION || '',
      endpoint: ensureValidUrl(
        process.env.DIGITALOCEAN_SPACES_ENDPOINT || '',
        'DIGITALOCEAN_SPACES_ENDPOINT',
      ),
      cdn: ensureValidUrl(process.env.DIGITALOCEAN_SPACES_CDN || '', 'DIGITALOCEAN_SPACES_CDN'),
    },
    providers: {
      nanoBananaApiKey: process.env.NANO_BANANA_API_KEY || '',
      klingApiKey: process.env.KLING_API_KEY || '',
      pikaApiKey: process.env.PIKA_API_KEY || '',
      runwayApiKey: process.env.RUNWAY_API_KEY || '',
      lumaApiKey: process.env.LUMA_API_KEY || '',
    },
  },
  upload: {
    maxFileSize: parseNumber(process.env.UPLOAD_MAX_FILE_SIZE, 52_428_800),
    allowedMimeTypes: parseOrigins(process.env.UPLOAD_ALLOWED_MIME_TYPES),
    sharpConcurrency: parseNumber(process.env.SHARP_CONCURRENCY, 4),
  },
  rateLimit: {
    windowMs: parseNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    maxRequests: parseNumber(process.env.RATE_LIMIT_MAX_REQUESTS, 200),
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    directory: process.env.LOG_DIR || './logs',
    maxFiles: process.env.LOG_MAX_FILES || '14d',
    maxSize: process.env.LOG_MAX_SIZE || '20m',
  },
  scheduling: {
    timezone: process.env.CRON_TIMEZONE || 'UTC',
    enabled: parseBoolean(process.env.ENABLE_CRON_JOBS, false),
  },
  runtime: {
    rootDirectory: projectRoot,
    isDevelopment: nodeEnv === 'development',
    isProduction,
    isTest: nodeEnv === 'test',
  },
});

export default environment;
