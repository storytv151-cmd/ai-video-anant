/**
 * Consistent success response envelope for API consumers.
 * This keeps API responses uniform across controllers and future modules.
 */
class ApiResponse {
  constructor({ statusCode = 200, success = true, message = 'Request successful.', data = null }) {
    this.statusCode = statusCode;
    this.success = success;
    this.message = message;
    this.data = data;
    this.timestamp = new Date().toISOString();
  }
}

export default ApiResponse;
