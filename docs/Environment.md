# Environment

## Overview

This backend is configured using environment variables. In production mode the server will refuse to start if required variables are missing.

## Variables

### Required In Production

- `PORT`
- `NODE_ENV`
- `MONGO_URI`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `COOKIE_SECRET`
- `GOOGLE_CLIENT_ID`
- `DIGITALOCEAN_SPACES_KEY`
- `DIGITALOCEAN_SPACES_SECRET`
- `DIGITALOCEAN_SPACES_BUCKET`
- `DIGITALOCEAN_SPACES_ENDPOINT`
- `LOG_LEVEL`

### CORS

- `CORS_ALLOWED_ORIGINS`
  - Comma-separated allowlist.
  - In production, the allowlist must be explicit and unknown origins are rejected.

### Storage (DigitalOcean Spaces)

- `DIGITALOCEAN_SPACES_BUCKET`
- `DIGITALOCEAN_SPACES_ENDPOINT`
- Optional: `DIGITALOCEAN_SPACES_CDN`

## Secrets Management

- Do not store secrets in source control.
- Configure secrets using your deployment platform’s secret manager or encrypted environment configuration.
