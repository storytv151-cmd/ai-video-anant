import ApiError from "../utils/ApiError.js";

const normalizeKey = (value) => String(value || "").trim();

const isValidKey = (value) => {
  const key = normalizeKey(value);
  if (!key) {
    return false;
  }
  if (key.length < 8 || key.length > 120) {
    return false;
  }
  return /^[A-Za-z0-9._:-]+$/.test(key);
};

const idempotency =
  (required = false) =>
  (request, response, next) => {
    const headerValue =
      request.headers["idempotency-key"] || request.headers["Idempotency-Key"];
    const key =
      typeof headerValue === "string" ? normalizeKey(headerValue) : null;

    if (!key) {
      request.idempotencyKey = null;
      if (required) {
        next(
          new ApiError(400, "Idempotency-Key header is required.", {
            code: "IDEMPOTENCY_KEY_REQUIRED",
          }),
        );
        return;
      }
      next();
      return;
    }

    if (!isValidKey(key)) {
      next(
        new ApiError(400, "Invalid Idempotency-Key header.", {
          code: "IDEMPOTENCY_KEY_INVALID",
        }),
      );
      return;
    }

    request.idempotencyKey = key;
    next();
  };

export default idempotency;
