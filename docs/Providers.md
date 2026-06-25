# AI Media Provider Engine

## Purpose

This module provides a provider-independent engine for AI media generation.

- Providers and provider models expose a capability matrix.
- Routing chooses a compatible provider at runtime.
- Adapters hide provider-specific APIs behind one contract.
- Public APIs expose only safe capability and pricing information for client UI building.

## Capability Model

Every `Provider` and `ProviderModel` can expose:

- `supportsTextToImage`
- `supportsImageToImage`
- `supportsTextToVideo`
- `supportsImageToVideo`
- `supportsVideoToVideo`
- `supportsImageUpscale`
- `supportsVideoUpscale`
- `supportsImageEditing`
- `supportsVideoEditing`
- `supportsBackgroundRemoval`
- `supportsFaceSwap`
- `supportsAudioGeneration`
- `supportsMultipleImages`
- `supportsReferenceImages`
- `supportsNegativePrompt`
- `supportsMaskImage`
- `maximumImages`
- `maximumDuration`
- `maximumResolution`
- `maximumOutputCount`

This removes hardcoded assumptions that a provider only exists for video generation.

## Provider Flow

1. A template and normalized execution context reach the routing layer.
2. Selection resolves requested `generationType` and `outputType`.
3. Providers are filtered by:
   - enabled status
   - health status
   - template compatibility
   - generation type support
   - output type support
   - reference image support
   - negative prompt support
   - mask support
   - multiple image support
   - output count limits
4. Models are filtered using the same capability rules.
5. The chosen provider/model pair is ranked by strategy.
6. Credits are resolved.
7. The provider adapter receives the media execution context.

## Provider Contract

Every provider adapter implements:

- `startGeneration()`
- `checkStatus()`
- `cancelGeneration()`
- `getProviderInfo()`
- `healthCheck()`

The interface stays stable even as the execution context expands to support new media types.

## Selection Strategy

Supported strategies remain:

- manual provider selection
- priority-based selection
- cheapest selection
- fastest selection
- highest-quality placeholder

These strategies are now media-aware because candidate filtering happens before ranking.

## Pricing Resolution

Credits are resolved in this order:

1. `VideoTemplate.creditsOverride`
2. `ProviderModel.credits`
3. `ProviderPricing`

Optional provider multipliers from metadata still apply.

## Failover

- On provider start failure, failover chooses another compatible provider while excluding previously attempted providers.
- Capability filtering is re-applied during failover so the replacement provider still matches the media request.

## Health And Metrics

Provider telemetry continues to track:

- request counts
- success counts
- failure counts
- error counts
- average response time
- last success time
- last failure time

Media-specific usage analytics are computed from generation jobs and returned through generation history summaries.

## Bootstrap And Public DTOs

Provider DTOs now expose enough metadata for Android to build UI dynamically:

- supported output types
- supported generation types
- prompt/reference/mask capability flags
- model-level limits

No internal provider secrets or unsafe configuration is exposed.

## Public APIs

- `GET /api/v1/providers`
- `GET /api/v1/providers/:slug`
- `GET /api/v1/providers/health`
- `GET /api/v1/providers/pricing`

## Admin APIs

- `GET /api/v1/admin/providers`
- `GET /api/v1/admin/providers/:slug`
- `GET /api/v1/admin/providers/health`
- `GET /api/v1/admin/providers/pricing`

## Future Integration

When real provider APIs are integrated:

- keep adapters under `src/services/videoProviders/`
- pass the normalized execution context into provider requests
- add callback polling or webhooks without changing controller contracts
- move execution to workers without changing routing or selection logic
