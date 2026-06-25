# AI Video Generation Engine

## Purpose

This module implements the application’s video generation lifecycle: template-driven job creation, provider selection and failover, wallet credit locking and settlement, storage validation, and history/status APIs. External provider APIs and queue workers are intentionally not integrated yet.

## Generation Lifecycle

1) Client selects a template and optionally chooses a provider and provider model.
2) Client uploads images to DigitalOcean Spaces (client-side or via future upload endpoints).
3) Client calls `POST /api/v1/generation/start` with template slug and input image URLs/metadata.
4) Server validates:
   - maintenance mode and generation enabled flags (AppSetting)
   - template active and within publish/expiry window
   - image count and storage URL rules (AppSetting storage/upload limits)
   - provider/model availability (database-driven)
   - wallet exists and enough credits
   - user concurrency limits (AppSetting apiLimits)
5) Server locks credits via the Wallet Engine.
6) Server creates a `VideoGenerationJob` and assigns a queue position (queue abstraction).
7) Server selects a provider/model using the selection strategy and attempts provider start.
8) Server stores `externalJobId` (placeholder) and returns job information.

## Credit Lifecycle

- Start:
  - Credits are locked via Wallet Engine (`lockCredits`) with the job as reference.
- Completion:
  - Locked credits are consumed via Wallet Engine (`consumeLockedCredits`).
- Failure / Cancel / Timeout:
  - Locked credits are unlocked back to the wallet via Wallet Engine (`unlockCredits`).

All settlement operations are idempotent and executed inside MongoDB transactions alongside job state updates.

## Idempotency

- Generation requests support `Idempotency-Key` header on:
  - `POST /api/v1/generation/start`
  - `POST /api/v1/generation/retry/:jobId`
  - `POST /api/v1/generation/cancel/:jobId`
- The server stores the key on the job as `clientRequestKey` to prevent duplicate job creation.
- Wallet mutations use derived idempotency keys scoped to `(jobId, retryCount, action)` so duplicates return the existing credit transaction.

## State Machine

Transitions are validated server-side:

- `pending → queued → processing`
- `processing → completed`
- `pending|queued|processing → cancelled|failed|timeout`
- `failed|cancelled|timeout → pending` (retry)

## Provider Lifecycle

- Providers are selected and started only through the provider engine:
  - `providerSelectionService` chooses provider/model using DB priority and health.
  - `providerRoutingService` starts generation through `providerFactory`.
- Provider failover:
  - On provider start failure, the engine selects the next eligible provider (excluding attempted providers).
  - Priority and availability are read from database fields (`enabled`, `priority`, `healthStatus`).

## Retry Strategy

- Retry is supported for failed/cancelled jobs.
- Retry limits are driven by AppSetting feature toggles when present.

## Refund Strategy

- Refund/unlock behavior is controlled through AppSettings feature toggles when present.
- The engine prefers unlocking locked credits; refunds are applied when credits were already consumed.

## Queue Strategy

- Queue implementation is placeholder-only.
- Queue position is assigned via a queue abstraction (`generationQueueProvider`) using an atomic counter persisted in `AppSetting` (safe under concurrency).
- Future: BullMQ/Redis can replace this provider without changing the generation service or controllers.

## Storage Flow

- Input images are validated as HTTPS URLs.
- In production, image URLs must be served from the configured DigitalOcean Spaces endpoint/bucket or configured CDN base URL.
- Image validation enforces:
  - allowed extensions (image file types)
  - allowed MIME types (validated against URL extension; client-provided MIME must match)
  - max size limits (client must send `sizeInBytes` when limits are configured)
  - required `storageKey` in production

## Polling Flow

- Polling services exist as placeholders for future background status checks.
- Current API supports reading job status via `GET /api/v1/generation/status/:jobId`.
- If a job exceeds `estimatedCompletionTime`, the status endpoint will transition it to `timeout` and unlock credits.

## Request Tracing & Audit Logging

- Every request includes `X-Request-ID` and it is propagated into logs.
- Generation start/cancel/retry actions write to `AuditLog` with request metadata.

## Public API Surface (Authenticated)

- `POST /api/v1/generation/start`
- `GET /api/v1/generation/status/:jobId`
- `GET /api/v1/generation/history`
- `POST /api/v1/generation/cancel/:jobId`
- `POST /api/v1/generation/retry/:jobId`
