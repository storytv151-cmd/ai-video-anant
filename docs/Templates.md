# Template Management Module

## Purpose

Templates are the primary resource for powering guided AI video generation flows. This module exposes public, read-optimized APIs designed to support thousands of templates with fast filtering and search.

## Category Flow

- Categories are loaded from `TemplateCategory`.
- Each category response includes:
  - templateCount (active templates)
  - featuredTemplates (subset) to support storefront-style layouts.

## Template Flow

- Templates are loaded from `VideoTemplate`.
- Public APIs only return templates that are:
  - `status = active`
  - within publish window (`publishAt` <= now if set)
  - not expired (`expiresAt` >= now if set)

## Provider Mapping

- `supportedProviders`: references `Provider` documents.
- `supportedProviderModels`: references `ProviderModel` documents (provider variants like Gen-4 Turbo).

## Credits Resolution

- If `creditsOverride` is set on the template, it is used as `creditsRequired`.
- Otherwise, credits are estimated using `ProviderPricing` for supported providers and matching duration.

## Search Strategy

- Current implementation supports case-insensitive partial match over:
  - title, description, slug, tags
- A text index exists on the template collection to prepare for future `$text` search.

## Recommendation Strategy

- Recommendation service is placeholder-ready.
- Current behavior is minimal and can be upgraded later using:
  - most used, trending, same category, personalized history

## Caching Plan (Future)

This module is a strong candidate for Redis caching due to repeated reads:

- cache template lists by normalized query signature
- cache template detail by slug
- invalidate on template/category updates (future admin module)

