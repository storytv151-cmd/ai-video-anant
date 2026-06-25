/**
 * Shared non-business constants used across the application foundation.
 * These values define framework-level defaults rather than domain rules.
 */
const HTTP_STATUS = Object.freeze({
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  SERVICE_UNAVAILABLE: 503,
});

const DATABASE_STATE = Object.freeze({
  DISCONNECTED: 'disconnected',
  CONNECTED: 'connected',
  CONNECTING: 'connecting',
  DISCONNECTING: 'disconnecting',
});

const REQUEST_SOURCES = Object.freeze({
  BODY: 'body',
  PARAMS: 'params',
  QUERY: 'query',
  HEADERS: 'headers',
});

export { HTTP_STATUS, DATABASE_STATE, REQUEST_SOURCES };
