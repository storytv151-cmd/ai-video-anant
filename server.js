/**
 * Application entrypoint.
 * This module initializes configuration, database connectivity, HTTP startup, and graceful shutdown.
 */
import http from 'node:http';
import app from './src/app.js';
import { connectDatabase, disconnectDatabase } from './src/config/database.js';
import environment from './src/config/environment.js';
import { applicationLogger, errorLogger } from './src/config/logger.js';

let server;

const gracefulShutdown = async (signal) => {
  try {
    applicationLogger.warn(`Received ${signal}. Starting graceful shutdown.`);

    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }

    await disconnectDatabase();
    applicationLogger.info('Graceful shutdown completed.');
    process.exit(0);
  } catch (error) {
    errorLogger.error('Graceful shutdown failed.', {
      message: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
};

process.on('unhandledRejection', async (reason) => {
  errorLogger.error('Unhandled promise rejection detected.', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  await gracefulShutdown('unhandledRejection');
});

process.on('uncaughtException', async (error) => {
  errorLogger.error('Uncaught exception detected.', {
    message: error.message,
    stack: error.stack,
  });
  await gracefulShutdown('uncaughtException');
});

process.on('SIGINT', async () => {
  await gracefulShutdown('SIGINT');
});

process.on('SIGTERM', async () => {
  await gracefulShutdown('SIGTERM');
});

const startServer = async () => {
  await connectDatabase();

  server = http.createServer(app);

  await new Promise((resolve) => {
    server.listen(environment.app.port, () => {
      applicationLogger.info(
        `${environment.app.name} running on port ${environment.app.port} in ${environment.app.env} mode.`,
      );
      resolve();
    });
  });
};

startServer().catch(async (error) => {
  errorLogger.error('Server startup failed.', {
    message: error.message,
    stack: error.stack,
  });
  await gracefulShutdown('startupFailure');
});
