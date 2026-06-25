/**
 * MongoDB connection lifecycle management for Mongoose.
 * The rest of the application depends on this module for safe connectivity state.
 */
import mongoose from 'mongoose';
import environment from './environment.js';
import { applicationLogger, errorLogger } from './logger.js';

const connectionStateMap = Object.freeze({
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
});

mongoose.connection.on('connected', () => {
  applicationLogger.info('MongoDB connection established.');
});

mongoose.connection.on('error', (error) => {
  errorLogger.error('MongoDB connection error.', {
    message: error.message,
    stack: error.stack,
  });
});

mongoose.connection.on('disconnected', () => {
  applicationLogger.warn('MongoDB connection closed.');
});

const connectDatabase = async () => {
  if (!environment.database.uri) {
    applicationLogger.warn('MONGO_URI is not configured. Database connection skipped.');
    return null;
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  await mongoose.connect(environment.database.uri, {
    dbName: environment.database.dbName,
    minPoolSize: environment.database.minPoolSize,
    maxPoolSize: environment.database.maxPoolSize,
    socketTimeoutMS: environment.database.socketTimeoutMS,
    serverSelectionTimeoutMS: environment.database.serverSelectionTimeoutMS,
  });

  return mongoose.connection;
};

const disconnectDatabase = async () => {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.disconnect();
};

const getDatabaseStatus = () => ({
  readyState: mongoose.connection.readyState,
  status: connectionStateMap[mongoose.connection.readyState] || 'unknown',
  host: mongoose.connection.host || null,
  name: mongoose.connection.name || environment.database.dbName,
});

export { connectDatabase, disconnectDatabase, getDatabaseStatus };
