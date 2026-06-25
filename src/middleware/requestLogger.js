/**
 * HTTP request logging middleware backed by Morgan and Winston.
 * It captures inbound traffic for observability without leaking implementation details.
 */
import morgan from 'morgan';
import environment from '../config/environment.js';
import { morganStream } from '../config/logger.js';

const requestLogger = environment.app.enableHttpLogging
  ? morgan('combined', { stream: morganStream })
  : (request, response, next) => next();

export default requestLogger;
