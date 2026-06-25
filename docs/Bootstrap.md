# Bootstrap API

## Purpose

Mobile clients should not make many configuration calls on startup. The Bootstrap endpoint exists to return a single, authoritative payload that includes dynamic configuration and (optionally) current user context.

## Android Startup Flow

1. Android app completes Google Sign-In and receives a Google ID Token.
2. App calls `POST /api/v1/auth/google` to exchange the Google ID Token for JWT tokens.
3. App calls `GET /api/v1/bootstrap` once to fetch:
   - dynamic AppSetting configuration
   - provider catalogs and pricing
   - upload limits and allowed file types
   - user wallet and subscription summary (if authenticated)

## Endpoint

### GET /api/v1/bootstrap

- Authentication: optional (supports `Authorization: Bearer <accessToken>`)
- If authenticated: includes user profile, wallet summary, and subscription summary
- If not authenticated: returns only public configuration

## Caching Plan (Future)

This endpoint is a primary candidate for caching (Redis) because:

- settings and provider catalogs change less frequently than requests
- clients may call bootstrap multiple times per session

Recommended future strategy:

- cache public payload keyed by app version + locale + platform
- cache user payload keyed by userId and short TTL
- invalidate public cache on AppSetting/provider changes

