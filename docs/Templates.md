# Template Management Module

## Purpose

Templates now describe guided AI media workflows, not only AI video flows.

- They tell the client what inputs are required.
- They tell the generation engine what validation rules apply.
- They constrain which providers and models are compatible.
- They remain backward-compatible with legacy video template data.

## Template Flow

- Templates are still stored in `VideoTemplate` for compatibility.
- Public APIs only return templates that are active and within publish/expiry windows.
- List and detail responses now expose media-aware fields so clients can build forms dynamically.

## Template Contract

Templates can define:

- `inputType`
- `generationType`
- `minimumImages`
- `maximumImages`
- `allowPrompt`
- `allowNegativePrompt`
- `allowReferenceImage`
- `allowMaskImage`
- `allowInputVideo`
- `allowInputAudio`
- `allowMultipleOutputs`
- `defaultAspectRatio`
- `supportedOutputTypes`

Legacy fields such as `requiredImages`, `aspectRatio`, and video-oriented prompt content still remain.

## Category Flow

- Categories still come from `TemplateCategory`.
- Template discovery remains optimized for storefront-style browsing.

## Provider Mapping

- `supportedProviders` references `Provider`
- `supportedProviderModels` references `ProviderModel`

These references are now interpreted against provider/media capabilities instead of only video availability.

## Public Response Shape

Template DTOs now include:

- generation type
- output types
- minimum and maximum image counts
- prompt support flags
- reference and mask support
- video and audio input flags
- multiple output support
- default aspect ratio

This keeps Android UI fully data-driven.

## Credits Resolution

- `creditsOverride` still takes precedence
- otherwise credits are resolved from provider pricing for supported providers/models

## Search And Discovery

The list, trending, featured, detail, and search flows remain unchanged at the route level, but they now return the widened media template contract.

## Backward Compatibility

- `VideoTemplate` name remains unchanged
- previous video templates continue to work
- `requiredImages` is still respected as a fallback when newer image limits are missing
- output type falls back to `video` when legacy templates do not specify media outputs

## Future Use

The same template model can now support:

- image editing workflows
- audio generation flows
- background removal
- face swap
- AI avatar and talking-photo flows
- batch or multi-step media pipelines
