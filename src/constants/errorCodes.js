/**
 * Error code constants placeholder.
 * Domain-specific error codes will be added in future phases.
 */
const ERROR_CODES = Object.freeze({
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTH_001: 'AUTH_001',
  AUTH_002: 'AUTH_002',
  USER_001: 'USER_001',
  WALLET_001: 'WALLET_001',
  PAYMENT_001: 'PAYMENT_001',
  PROVIDER_001: 'PROVIDER_001',
  GENERATION_001: 'GENERATION_001',
  SYSTEM_001: 'SYSTEM_001',
});

const ERROR_CATALOG = Object.freeze({
  [ERROR_CODES.AUTH_001]: { statusCode: 401, message: 'Authentication required.' },
  [ERROR_CODES.AUTH_002]: { statusCode: 403, message: 'Access denied.' },
  [ERROR_CODES.USER_001]: { statusCode: 404, message: 'User not found.' },
  [ERROR_CODES.WALLET_001]: { statusCode: 400, message: 'Wallet operation failed.' },
  [ERROR_CODES.PAYMENT_001]: { statusCode: 400, message: 'Payment operation failed.' },
  [ERROR_CODES.PROVIDER_001]: { statusCode: 400, message: 'Provider operation failed.' },
  [ERROR_CODES.GENERATION_001]: { statusCode: 400, message: 'Generation operation failed.' },
  [ERROR_CODES.SYSTEM_001]: { statusCode: 500, message: 'Internal server error.' },
});

export default ERROR_CODES;
export { ERROR_CATALOG };
