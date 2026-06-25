/**
 * Response formatter helpers keep controllers concise and consistent.
 * All success and error payloads should flow through these utilities.
 */
import ApiResponse from './ApiResponse.js';

const formatSuccessResponse = ({ statusCode = 200, message, data }) =>
  new ApiResponse({
    statusCode,
    success: true,
    message: message || 'Request successful.',
    data,
  });

const formatErrorResponse = ({ statusCode = 500, message, error }) => ({
  statusCode,
  success: false,
  message: message || 'An unexpected error occurred.',
  error,
  timestamp: new Date().toISOString(),
});

export { formatSuccessResponse, formatErrorResponse };
