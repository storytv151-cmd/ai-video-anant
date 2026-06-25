/**
 * Wraps async route handlers and forwards rejected promises to Express.
 * This avoids repetitive try/catch blocks in controllers.
 */
const asyncHandler = (handler) => async (request, response, next) => {
  try {
    await handler(request, response, next);
  } catch (error) {
    next(error);
  }
};

export default asyncHandler;
