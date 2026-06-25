# AI Media Generation Engine

## Purpose

This module now implements the application’s media generation lifecycle, not only video generation.

- It creates media-aware jobs from templates and user inputs.
- It validates prompt, image, video, audio, reference, and mask requirements dynamically.
- It selects a compatible provider and model using capability-aware routing.
- It locks and settles credits through the wallet engine.
- It exposes status and history APIs without breaking legacy video clients.

## Supported Generation Types

- `text_to_image`
- `image_to_image`
- `text_to_video`
- `image_to_video`
- `video_to_video`
- `image_upscale`
- `video_upscale`
- `image_edit`
- `video_edit`
- `background_remove`
- `face_swap`
- `audio_generation`
- `future_custom`

Legacy aliases are still accepted and normalized internally for older clients.

## Generation Flow

1. Client selects a template and optionally chooses a provider and provider model.
2. Client uploads or references media assets from approved storage.
3. Client calls `POST /api/v1/generation/start`.
4. The server resolves the template and builds a normalized execution context:
   - `generationType`
   - `outputType`
   - `prompt`
   - `negativePrompt`
   - `inputImages`
   - `inputVideos`
   - `inputAudio`
   - `referenceImages`
   - `maskImages`
   - `multipleOutputs`
5. Validation runs dynamically from template rules and requested generation type.
6. Provider selection filters by media capability and template compatibility.
7. Credits are locked transactionally.
8. A job document is created in `VideoGenerationJob` with media-aware fields.
9. The provider adapter receives the execution context and returns a placeholder start result.
10. Status and history APIs return both backward-compatible video fields and the new media fields.

## Dynamic Validation Rules

Validation is no longer hardcoded to video-only assumptions.

- `text_to_image`: prompt required, image not required
- `text_to_video`: prompt required, media input optional unless template says otherwise
- `image_to_video`: at least one input image required
- `video_to_video`: at least one input video required
- `image_edit`: input image required, mask optional when enabled
- `audio_generation`: prompt or input audio required

Templates further refine the rules through:

- `minimumImages`
- `maximumImages`
- `allowPrompt`
- `allowNegativePrompt`
- `allowReferenceImage`
- `allowMaskImage`
- `allowInputVideo`
- `allowInputAudio`
- `allowMultipleOutputs`
- `supportedOutputTypes`

## Job Model

`VideoGenerationJob` now stores:

- `generationType`
- `outputType`
- `prompt`
- `negativePrompt`
- `inputImages`
- `inputVideos`
- `inputAudio`
- `referenceImages`
- `maskImages`
- `multipleOutputs`
- `outputAssets`

Backward compatibility remains through:

- `outputVideo`
- existing collection name
- existing routes under `/api/v1/generation` and `/api/v1/generations`

## Credit Lifecycle

- Start: credits are locked with job-scoped idempotency keys
- Completion: locked credits are consumed
- Failure, cancel, timeout: locked credits are unlocked

All settlement paths remain transaction-safe and idempotent.

## Provider Routing

- `providerSelectionService` filters providers and models by capability, output type, template compatibility, and requested inputs.
- `providerRoutingService` plans and starts generation through the provider factory.
- `providerFailoverService` retries with the next eligible provider when allowed.

## Storage Validation

The generation layer validates all referenced assets against storage rules:

- image assets
- video assets
- audio assets
- reference images
- mask images

Validation checks:

- allowed HTTPS URLs
- approved Spaces or CDN origins in production
- MIME and extension consistency
- size limits
- required `storageKey` in production

## Analytics

Generation history now includes analytics for the filtered result set:

- images generated
- videos generated
- audio generated
- average generation time
- provider usage
- generation type usage
- failure rate
- credits used

## Queue, Polling, And Future Execution

- Queue assignment remains abstracted behind `generationQueueProvider`.
- Polling remains placeholder-ready.
- Real provider callbacks, worker queues, batch generation, and multi-step workflows can be added without changing controller contracts.

## Public API Surface

- `POST /api/v1/generation/start`
- `GET /api/v1/generation/status/:jobId`
- `GET /api/v1/generation/history`
- `POST /api/v1/generation/cancel/:jobId`
- `POST /api/v1/generation/retry/:jobId`
