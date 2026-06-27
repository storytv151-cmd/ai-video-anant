/**
 * Token service for JWT access and refresh tokens (HS256).
 * Access tokens are short-lived and never stored.
 * Refresh tokens are long-lived JWTs that are stored (hashed) in MongoDB for revocation and rotation.
 */
import crypto from "node:crypto";
import environment from "../../config/environment.js";
import ApiError from "../../utils/ApiError.js";

const base64UrlEncode = (input) => Buffer.from(input).toString("base64url");
const base64UrlEncodeJson = (value) => base64UrlEncode(JSON.stringify(value));
const base64UrlDecode = (input) =>
  Buffer.from(input, "base64url").toString("utf8");

const parseDurationToSeconds = (value, fallbackSeconds) => {
  if (!value) {
    return fallbackSeconds;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }

  const normalized = String(value).trim().toLowerCase();
  const match = normalized.match(/^(\d+)(s|m|h|d)$/);
  if (!match) {
    return fallbackSeconds;
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const multiplierMap = Object.freeze({ s: 1, m: 60, h: 3600, d: 86400 });
  return Math.max(0, amount * (multiplierMap[unit] || 1));
};

const createHmacSignature = (secret, data) =>
  crypto.createHmac("sha256", secret).update(data).digest("base64url");

const safeEqual = (a, b) => {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(aBuffer, bBuffer);
};

const nowInSeconds = () => Math.floor(Date.now() / 1000);

const buildJwt = ({ secret, payload, expiresInSeconds }) => {
  if (!secret) {
    throw new ApiError(500, "JWT secret is not configured.", {
      code: "JWT_SECRET_MISSING",
    });
  }

  const issuedAt = nowInSeconds();
  const header = { alg: "HS256", typ: "JWT" };
  const fullPayload = {
    ...payload,
    iat: issuedAt,
    exp: issuedAt + expiresInSeconds,
    jti: crypto.randomUUID(),
  };

  const encodedHeader = base64UrlEncodeJson(header);
  const encodedPayload = base64UrlEncodeJson(fullPayload);
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmacSignature(secret, signingInput);

  return { token: `${signingInput}.${signature}`, payload: fullPayload };
};

const verifyJwt = ({ secret, token, expectedType }) => {
  if (!token) {
    throw new ApiError(401, "Missing token.", { code: "TOKEN_MISSING" });
  }

  if (!secret) {
    throw new ApiError(500, "JWT secret is not configured.", {
      code: "JWT_SECRET_MISSING",
    });
  }

  const parts = String(token).split(".");
  if (parts.length !== 3) {
    throw new ApiError(401, "Invalid token format.", { code: "TOKEN_INVALID" });
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = createHmacSignature(secret, signingInput);

  if (!safeEqual(signature, expectedSignature)) {
    throw new ApiError(401, "Invalid token signature.", {
      code: "TOKEN_INVALID",
    });
  }

  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    throw new ApiError(401, "Invalid token payload.", {
      code: "TOKEN_INVALID",
    });
  }

  if (!payload?.exp || typeof payload.exp !== "number") {
    throw new ApiError(401, "Invalid token expiry.", { code: "TOKEN_INVALID" });
  }

  if (payload.exp <= nowInSeconds()) {
    throw new ApiError(401, "Token expired.", { code: "TOKEN_EXPIRED" });
  }

  if (expectedType && payload.typ !== expectedType) {
    throw new ApiError(401, "Invalid token type.", {
      code: "TOKEN_INVALID_TYPE",
    });
  }

  return payload;
};

const hashToken = (token) =>
  crypto.createHash("sha256").update(String(token)).digest("hex");

const tokenService = Object.freeze({
  hashToken,
  generateAccessToken: ({ userId, role }) => {
    const expiresInSeconds = parseDurationToSeconds(
      environment.security.jwtAccessExpires,
      15 * 60,
    );
    return buildJwt({
      secret: environment.security.jwtSecret,
      expiresInSeconds,
      payload: {
        typ: "access",
        sub: String(userId),
        role: role || "user",
      },
    });
  },
  generateRefreshToken: ({ userId, deviceId }) => {
    const expiresInSeconds = parseDurationToSeconds(
      environment.security.jwtRefreshExpires,
      30 * 24 * 60 * 60,
    );
    return buildJwt({
      secret: environment.security.jwtRefreshSecret,
      expiresInSeconds,
      payload: {
        typ: "refresh",
        sub: String(userId),
        deviceId: deviceId ? String(deviceId) : null,
      },
    });
  },
  verifyAccessToken: (token) =>
    verifyJwt({
      secret: environment.security.jwtSecret,
      token,
      expectedType: "access",
    }),
  verifyRefreshToken: (token) =>
    verifyJwt({
      secret: environment.security.jwtRefreshSecret,
      token,
      expectedType: "refresh",
    }),
});

export default tokenService;
