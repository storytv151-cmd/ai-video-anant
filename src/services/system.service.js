/**
 * System service assembles operational metadata for health and root endpoints.
 * This keeps controllers thin and centralizes non-domain service orchestration.
 */
import os from 'node:os';
import environment from '../config/environment.js';
import { getDatabaseStatus } from '../config/database.js';

const buildSystemSnapshot = () => ({
  app: {
    name: environment.app.name,
    version: environment.app.version,
    environment: environment.app.env,
    apiBasePath: environment.app.apiBasePath,
    apiVersion: environment.app.apiVersion,
  },
  server: {
    timestamp: new Date().toISOString(),
    uptimeInSeconds: Number(process.uptime().toFixed(2)),
    pid: process.pid,
    platform: os.platform(),
    nodeVersion: process.version,
  },
  database: getDatabaseStatus(),
});

const getRootInformation = async () => ({
  ...buildSystemSnapshot(),
  message: 'AI Video Generation Platform backend foundation is running.',
});

const getHealthInformation = async () => ({
  ...buildSystemSnapshot(),
  status: 'ok',
});

const getVersionedInformation = async () => ({
  ...buildSystemSnapshot(),
  status: 'ok',
  message: 'Versioned API entrypoint is available.',
});

export { getRootInformation, getHealthInformation, getVersionedInformation };
