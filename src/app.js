/**
 * Express application bootstrap.
 * This file wires framework middleware, routing, and centralized error handling.
 */
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import environment from './config/environment.js';
import errorHandler from './middleware/errorHandler.js';
import notFound from './middleware/notFound.js';
import rateLimiter from './middleware/rateLimiter.js';
import requestLogger from './middleware/requestLogger.js';
import { apiRouter, publicRouter, versionedApiPath } from './routes/index.js';

sharp.concurrency(environment.upload.sharpConcurrency);

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', environment.app.trustProxy);

app.use((request, response, next) => {
  if (environment.app.enableRequestIdHeader) {
    response.setHeader('x-request-id', uuidv4());
  }

  next();
});

app.use(helmet());
app.use(
  cors({
    origin:
      environment.security.corsAllowedOrigins.length > 0
        ? environment.security.corsAllowedOrigins
        : true,
    credentials: true,
  }),
);
app.use(compression());
app.use(requestLogger);
app.use(express.json({ limit: environment.app.bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: environment.app.bodyLimit }));
app.use(cookieParser(environment.security.cookieSecret || undefined));
app.use(rateLimiter);
app.use(express.static(path.join(environment.runtime.rootDirectory, 'public')));

app.use('/', publicRouter);
app.use(versionedApiPath, apiRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
