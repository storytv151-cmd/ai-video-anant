/**
 * Google service verifies Google ID Tokens using google-auth-library.
 * It normalizes the decoded identity payload for the authentication service.
 */
import { OAuth2Client } from 'google-auth-library';
import environment from '../../config/environment.js';
import ApiError from '../../utils/ApiError.js';

const getOAuthClient = () => {
  const clientId = environment.integrations.googleClientId;
  if (!clientId) {
    throw new ApiError(500, 'GOOGLE_CLIENT_ID is not configured.', {
      code: 'GOOGLE_CLIENT_ID_MISSING',
    });
  }

  return new OAuth2Client(clientId);
};

const verifyIdToken = async (idToken) => {
  if (!idToken || typeof idToken !== 'string') {
    throw new ApiError(400, 'Google ID token is required.', { code: 'GOOGLE_ID_TOKEN_MISSING' });
  }

  const client = getOAuthClient();
  let ticket;

  try {
    ticket = await client.verifyIdToken({
      idToken,
      audience: environment.integrations.googleClientId,
    });
  } catch (error) {
    throw new ApiError(401, 'Google verification failed.', {
      code: 'GOOGLE_VERIFICATION_FAILED',
      details: [{ message: error.message }],
    });
  }

  const payload = ticket.getPayload();
  if (!payload?.sub || !payload?.email) {
    throw new ApiError(401, 'Google token payload is invalid.', { code: 'GOOGLE_PAYLOAD_INVALID' });
  }

  return {
    googleId: payload.sub,
    email: String(payload.email).toLowerCase(),
    emailVerified: Boolean(payload.email_verified),
    name: payload.name || payload.given_name || 'User',
    picture: payload.picture || null,
  };
};

const googleService = Object.freeze({ verifyIdToken });

export default googleService;
