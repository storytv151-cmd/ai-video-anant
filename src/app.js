/**
 * Express application bootstrap.
 * This file wires framework middleware, routing, and centralized error handling.
 */
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import path from "node:path";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import validator from "validator";
import environment from "./config/environment.js";
import errorHandler from "./middleware/errorHandler.js";
import notFound from "./middleware/notFound.js";
import rateLimiter from "./middleware/rateLimiter.js";
import requestLogger from "./middleware/requestLogger.js";
import { apiRouter, publicRouter, versionedApiPath } from "./routes/index.js";
import { runWithRequestContext } from "./utils/requestContext.js";

sharp.concurrency(environment.upload.sharpConcurrency);

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", environment.app.trustProxy);

app.use((request, response, next) => {
  const incomingId = request.headers["x-request-id"];
  const requestId =
    environment.app.enableRequestIdHeader &&
    typeof incomingId === "string" &&
    validator.isUUID(incomingId)
      ? incomingId
      : uuidv4();

  request.requestId = requestId;
  response.setHeader("x-request-id", requestId);

  runWithRequestContext(
    {
      requestId,
      ip: request.ip,
      path: request.originalUrl,
      method: request.method,
    },
    () => next(),
  );
});

app.use(helmet());
app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      const allowlist = environment.security.corsAllowedOrigins || [];

      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowlist.length === 0) {
        if (environment.runtime.isProduction) {
          callback(new Error("CORS origin is not allowed."), false);
          return;
        }
        callback(null, true);
        return;
      }

      if (allowlist.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("CORS origin is not allowed."), false);
    },
  }),
);
app.use(compression());
app.use(requestLogger);
app.use(express.json({ limit: environment.app.bodyLimit }));
app.use(
  express.urlencoded({ extended: true, limit: environment.app.bodyLimit }),
);
app.use(cookieParser(environment.security.cookieSecret || undefined));
app.use(rateLimiter);
app.use(express.static(path.join(environment.runtime.rootDirectory, "public")));

app.use("/", publicRouter);
app.use(versionedApiPath, apiRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
