/**
 * Winston logger configuration for application, HTTP, and error logging.
 * Transports are environment-aware and support daily rotating files.
 */
import fs from 'node:fs';
import path from 'node:path';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import environment from './environment.js';

const { combine, timestamp, errors, json, colorize, printf, metadata } = winston.format;

const logDirectory = path.resolve(environment.runtime.rootDirectory, environment.logging.directory);
fs.mkdirSync(logDirectory, { recursive: true });

const consoleFormat = combine(
  colorize(),
  timestamp(),
  errors({ stack: true }),
  metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
  printf(({ level, message, timestamp: logTimestamp, stack, metadata: meta }) => {
    const metadataString =
      meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `${logTimestamp} [${level}] ${stack || message}${metadataString}`;
  }),
);

const fileFormat = combine(timestamp(), errors({ stack: true }), json());

const consoleLogger = new winston.transports.Console({
  level: environment.logging.level,
  format: consoleFormat,
});

const buildRotatingFileTransport = (filename, level) =>
  new DailyRotateFile({
    level,
    dirname: logDirectory,
    filename,
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: environment.logging.maxSize,
    maxFiles: environment.logging.maxFiles,
    format: fileFormat,
  });

const fileLogger = buildRotatingFileTransport('application-%DATE%.log', environment.logging.level);
const errorFileLogger = buildRotatingFileTransport('error-%DATE%.log', 'error');
const httpFileLogger = buildRotatingFileTransport('http-%DATE%.log', 'http');

const baseTransports = environment.runtime.isProduction ? [fileLogger] : [consoleLogger];

const createLogger = (defaultMeta = {}) =>
  winston.createLogger({
    level: environment.logging.level,
    defaultMeta,
    transports: baseTransports,
    exitOnError: false,
  });

const applicationLogger = createLogger({ service: 'application' });
const errorLogger = winston.createLogger({
  level: 'error',
  defaultMeta: { service: 'error' },
  transports: environment.runtime.isProduction ? [errorFileLogger] : [consoleLogger],
  exitOnError: false,
});
const httpLogger = winston.createLogger({
  level: 'http',
  defaultMeta: { service: 'http' },
  transports: environment.runtime.isProduction ? [httpFileLogger] : [consoleLogger],
  exitOnError: false,
});

if (environment.runtime.isProduction) {
  applicationLogger.add(errorFileLogger);
  applicationLogger.add(httpFileLogger);
}

const morganStream = {
  write: (message) => {
    httpLogger.http(message.trim());
  },
};

export {
  applicationLogger,
  errorLogger,
  httpLogger,
  consoleLogger,
  fileLogger,
  morganStream,
};
