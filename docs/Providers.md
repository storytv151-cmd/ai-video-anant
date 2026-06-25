# AI Provider Engine

## Purpose

This module provides a plugin-based provider engine for AI video generation. It standardizes provider interaction behind a single contract and exposes public read APIs for providers, models, pricing, and health.

## Provider Lifecycle

- Provider metadata is stored in `Provider` and `ProviderModel` collections.
- A provider adapter is created through the provider factory using the provider slug.
- Generation (future): routing selects an eligible provider and model, validates limits/health, resolves credits, then calls the provider adapter.

## Provider Contract

Every provider adapter implements:

- `startGeneration()`
- `checkStatus()`
- `cancelGeneration()`
- `getProviderInfo()`
- `healthCheck()`

## Routing

Routing is handled by the routing service:

1) Validate template/provider/model compatibility (future extensions can add deeper capability validation).
2) Select provider and model (manual or automatic strategy).
3) Validate provider limits (duration limits are enforced; other limits are future-ready).
4) Resolve credits.
5) Start generation (placeholder; no real external APIs are called).

## Failover Strategy

- If a provider attempt fails, the failover service selects the next eligible provider using the same strategy and excluding attempted providers.
- Priority and availability come from the database (`Provider.enabled`, `Provider.priority`, `Provider.healthStatus`).

## Pricing Resolution

Final credits are resolved using this priority:

1) Template override (`VideoTemplate.creditsOverride`)
2) Provider model pricing (`ProviderModel.credits`)
3) Provider pricing table (`ProviderPricing`), using the minimum credits for the provider and requested duration

An optional multiplier can be provided via `Provider.metadata.creditsMultiplier` (defaulting to 1 when missing).

## Selection Strategy

Supported strategies:

- Manual selection by provider slug (and optional model slug)
- Priority-based selection
- Cheapest selection (based on resolved credits)
- Fastest selection (uses model estimated time when present, otherwise provider average response time)
- Highest-quality placeholder (uses model priority where available)

Strategies are implemented in a way that can be made dynamic via settings without changing controller contracts.

## Health Monitoring

Health uses `Provider.healthStatus` and counters/telemetry stored on the `Provider` document:

- `Healthy | Warning | Offline | Maintenance`
- Average response time
- Success/failure counts and last success/failure timestamps

The metrics service updates these counters (pipeline update when available; safe fallback otherwise).

## Public APIs

- `GET /api/v1/providers`
- `GET /api/v1/providers/:slug`
- `GET /api/v1/providers/health`
- `GET /api/v1/providers/pricing`

These endpoints are read-only and return only public provider information (DTOs). They never expose internal configuration, health metrics, failure counts, retry configuration, internal notes, or internal IDs.

## Admin APIs

Admin-only provider endpoints return internal telemetry and configuration:

- `GET /api/v1/admin/providers`
- `GET /api/v1/admin/providers/:slug`
- `GET /api/v1/admin/providers/health`
- `GET /api/v1/admin/providers/pricing`

## Future Integration Guide

When integrating real provider APIs:

- Implement provider-specific adapters under `src/services/videoProviders/` without changing controllers.
- Add webhook callbacks and job status streaming behind the same provider contract.
- Move generation execution to background workers/queues while keeping routing and pricing logic in services.
