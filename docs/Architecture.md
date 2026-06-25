# AI Media Platform Architecture

## Overview

This backend now operates as an AI media generation platform, not only an AI video platform.

- Controllers remain thin and only orchestrate HTTP concerns.
- Services own business rules, provider routing, wallet settlement, storage validation, and DTO shaping.
- Models remain schema definitions with backward-compatible field widening instead of destructive renames.
- Middleware handles auth, validation, idempotency, tracing, logging, and errors.

## Why It Is Now A Media Platform

The original architecture centered on image-to-video and text-to-video workflows. The platform now supports a generalized generation contract built around:

- generation types such as `text_to_image`, `image_to_image`, `text_to_video`, `image_to_video`, `video_to_video`, `image_upscale`, `video_upscale`, `image_edit`, `video_edit`, `background_remove`, `face_swap`, `audio_generation`, and `future_custom`
- output types such as `image`, `video`, `audio`, `zip`, and `multiple_files`
- provider and model capability matrices instead of hardcoded video assumptions
- template-driven input declarations instead of fixed `requiredImages` logic
- generation jobs that can carry images, videos, audio, masks, references, prompts, and multiple outputs

Existing `/api/v1` endpoints and legacy video fields remain available so previous Android and backend integrations keep working.

## Domain Layers

### Bootstrap Layer

- `GET /api/v1/bootstrap` returns public app configuration plus provider capability data.
- Android can build UI dynamically from provider/model capabilities, supported generation types, supported output types, and template requirements.
- Backward-compatible flags such as `videoGenerationEnabled` remain, while `mediaGenerationEnabled` is now also exposed.
- Bootstrap also exposes membership plan catalogs, feature catalogs, and current subscription summaries for dynamic premium UI rendering.

### Template Layer

- `VideoTemplate` still stores legacy video templates but now acts as the generic media template contract.
- Templates define input rules such as `inputType`, `minimumImages`, `maximumImages`, `allowPrompt`, `allowNegativePrompt`, `allowReferenceImage`, `allowMaskImage`, `allowInputVideo`, `allowInputAudio`, `allowMultipleOutputs`, `defaultAspectRatio`, and `supportedOutputTypes`.
- Legacy fields such as `requiredImages` and `aspectRatio` remain for compatibility.

### Provider Layer

- `Provider` and `ProviderModel` expose media generation capabilities and limits.
- Provider selection is capability-aware and considers generation type, output type, prompt features, reference images, masks, multiple image support, template compatibility, and model compatibility.
- Provider routing stays provider-independent through adapters and the factory pattern.

### Generation Layer

- `VideoGenerationJob` remains the collection name for compatibility, but the document is now media-capable.
- Jobs can store `inputImages`, `inputVideos`, `inputAudio`, `referenceImages`, `maskImages`, `prompt`, `negativePrompt`, `generationType`, `outputType`, `multipleOutputs`, and `outputAssets`.
- Legacy `outputVideo` is preserved so existing video clients do not break.

### Membership Layer

- Membership is a dedicated business engine separate from credits and payments.
- Plans and feature flags are loaded from `AppSetting.subscriptionPlans` and `membershipSettings`.
- `featureAccessService` centralizes premium feature checks so no module needs ad hoc subscription logic.
- User subscription state stores plan version, feature snapshots, renewal counts, and embedded lifecycle history without requiring a new collection.
- Google Play subscription verification and RTDN processing synchronize membership state through a shared subscription sync service.

### Storage Layer

- Storage is organized around generic `FileAsset` records instead of video-only artifacts.
- The storage engine now supports images, videos, audio, temporary uploads, reference images, mask images, and output collections.
- Signed URLs, validation, and cleanup remain service-driven and provider-independent.

## Runtime Flow

1. Client loads bootstrap and reads provider/template capability metadata.
2. Client selects a template and submits prompt/media inputs.
3. Generation validation resolves template rules dynamically by generation type and output type.
4. Storage validation checks image/video/audio asset metadata and allowed origins.
5. Provider selection chooses a compatible provider and model.
6. Wallet credits are locked transactionally.
7. A generation job is created with media-aware input/output metadata.
8. Provider execution starts through the adapter contract.
9. Status and history APIs return backward-compatible video fields plus the new media fields.
10. Premium feature access can be evaluated independently of credits through the membership engine.
11. Google Play subscription webhooks and manual verification update membership without affecting credit accounting.

## Backward Compatibility

- `/api/v1` remains unchanged.
- Existing generation endpoints keep the same URLs.
- Existing `VideoTemplate` and `VideoGenerationJob` model names are preserved.
- Existing `outputVideo` responses remain present.
- Legacy generation aliases such as `image_and_prompt`, `multi_image`, and `video_extend` are normalized into the new generation model.

## Analytics

Analytics tracking is now media-aware:

- images generated
- videos generated
- audio generated
- average generation time
- provider usage
- generation type usage
- failure rate
- credits used

The generation history flow now includes a summary object for the same filtered dataset, while provider request telemetry continues to update operational counters.

## Future Expansion

The architecture now has placeholders for:

- AI Avatar
- AI Character
- AI Talking Photo
- AI Lip Sync
- AI Voice
- AI Music
- AI Animation
- 3D Generation
- Multi-step Workflow
- Batch Generation

## Operational Guarantees

- Every request carries `X-Request-ID`.
- Audit logs capture generation, auth, and wallet actions.
- Wallet settlement remains transactional and idempotent.
- Providers stay isolated behind adapters.
- DTOs prevent leaking internal provider or database internals to public clients.
