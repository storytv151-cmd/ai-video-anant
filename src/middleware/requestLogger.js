/**
 * HTTP request logging middleware backed by Morgan and Winston.
 * It captures inbound traffic for observability without leaking implementation details.
 */
import morgan from 'morgan';
import environment from '../config/environment.js';
import { morganStream } from '../config/logger.js';

morgan.token('request-id', (request) => request.requestId || request.headers['x-request-id'] || '');
morgan.token('user-id', (request) => request.user?.id || '');

const requestLogger = environment.app.enableHttpLogging
  ? morgan(
      ':method :url :status :res[content-length] - :response-time ms rid=:request-id uid=:user-id',
      { stream: morganStream },
    )
  : (request, response, next) => next();

export default requestLogger;
