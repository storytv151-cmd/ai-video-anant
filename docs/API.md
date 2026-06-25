# API

## Overview

All APIs are served under `/api/<version>`. Current version is `/api/v1`.

## Versioning

- Keep `/api/v1` stable.
- Prepare for future `/api/v2` by adding new routes under `/api/v2` without changing existing `/api/v1` routes.

## Common Headers

- `Authorization: Bearer <accessToken>` (authenticated endpoints)
- `X-Request-ID`
  - If provided, it will be echoed back.
  - If missing, the server generates one and includes it in the response.
- `Idempotency-Key`
  - Supported on wallet-changing and generation-changing endpoints to prevent duplicate execution.

## Modules

### Auth

- `POST /api/v1/auth/google`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/logout-all`
- `GET /api/v1/auth/me`

### Bootstrap

- `GET /api/v1/bootstrap` (optional auth)

### Wallet / Rewards

- `GET /api/v1/wallet`
- `GET /api/v1/wallet/history`
- `GET /api/v1/wallet/summary`
- `POST /api/v1/wallet/promo` (idempotent)
- `POST /api/v1/reward/daily` (idempotent)
- `POST /api/v1/reward/ad` (idempotent)

### Providers

Public (sanitized):

- `GET /api/v1/providers`
- `GET /api/v1/providers/:slug`
- `GET /api/v1/providers/health`
- `GET /api/v1/providers/pricing`

Admin (protected, internal metrics):

- `GET /api/v1/admin/providers`
- `GET /api/v1/admin/providers/:slug`
- `GET /api/v1/admin/providers/health`
- `GET /api/v1/admin/providers/pricing`

### Generation

- `POST /api/v1/generation/start` (idempotent)
- `GET /api/v1/generation/status/:jobId`
- `GET /api/v1/generation/history`
- `POST /api/v1/generation/cancel/:jobId` (idempotent)
- `POST /api/v1/generation/retry/:jobId` (idempotent)

### Upload / Storage

- `POST /api/v1/upload/image`
- `POST /api/v1/upload/video`
- `POST /api/v1/upload/banner`
- `POST /api/v1/upload/profile`
- `DELETE /api/v1/upload/:fileId`
- `GET /api/v1/upload/signed-url`

### Payments

- `GET /api/v1/payment/packages`
- `POST /api/v1/payment/google/verify` (idempotent placeholder)
- `POST /api/v1/payment/restore` (idempotent placeholder)
- `GET /api/v1/payment/history`
- `GET /api/v1/subscriptions`
- `GET /api/v1/subscription/current`

Plural compatibility remains available for payment routes under `/api/v1/payments`.
