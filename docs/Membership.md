# Subscription & Membership Engine

## Scope

This phase adds the business engine for subscriptions and membership access without integrating Google Play subscription billing.

- Membership controls premium features only
- Credits continue to control AI generation usage
- No unlimited image or video generation is granted by subscription
- Plan and feature definitions are fully database-driven

## Why Subscription And Credits Are Separated

The platform uses two different commercial controls:

- credits control usage-based AI generation consumption
- subscriptions control premium product access and experience

This separation prevents subscription plans from bypassing wallet accounting, provider cost controls, and generation settlement logic.

Examples:

- a premium user may access better templates or premium models
- the same premium user still spends credits for actual generation jobs

## Membership Plans

The engine is prepared for:

- `free`
- `premium_monthly`
- `premium_quarterly`
- `premium_yearly`
- future `creator`
- future `family`
- future `enterprise`

Plans are loaded from `AppSetting.subscriptionPlans`.

## Dynamic Features

Each plan can define dynamic feature flags such as:

- `removeAds`
- `premiumTemplates`
- `priorityQueue`
- `highResolution`
- `maxConcurrentJobs`
- `dailyRewardMultiplier`
- `creditPurchaseDiscount`
- `premiumModels`
- `premiumSupport`
- `betaFeatures`
- `futureFeatures`

Nothing is hardcoded in controllers.

## Architecture

### Membership Service

`membershipService` resolves:

- membership settings
- default free plan
- normalized plan definitions
- feature snapshots
- remaining days and plan metadata

### Subscription Service

`subscriptionService` handles:

- current subscription response building
- public plan listing
- feature-access lookups
- current enabled feature listing
- subscription history listing
- internal plan-state upsert flow for future renew, upgrade, downgrade, pause, resume, and expire transitions

### Feature Access Service

`featureAccessService` is the centralized gatekeeper for premium checks.

No module should manually inspect subscription state. Instead, use:

- `featureAccessService.canUseFeature(user, featureName)`
- `featureAccessService.getEnabledFeatures(user)`

### Validation Service

`subscriptionValidationService` validates:

- plan existence
- feature existence
- supported statuses
- supported transition types
- expiry-related constraints

### History Service

`subscriptionHistoryService` reads the embedded user subscription history with pagination.

### Scheduler Placeholder

`subscriptionSchedulerService` defines future scheduler responsibilities:

- detect expired subscriptions
- move subscriptions into grace period
- disable premium
- send expiry and renewal notifications

## Feature Access Flow

1. Client authenticates.
2. Client calls `GET /api/v1/subscription/current` or `GET /api/v1/membership/features`.
3. Backend resolves membership config from database.
4. Backend resolves the user’s effective plan and feature snapshot.
5. Feature access is evaluated centrally by `featureAccessService`.
6. Route middleware or services use the returned decision instead of manual checks.

## Premium Middleware

Two reusable middleware are now available:

- `requirePremium`
- `requireFeature(featureName)`

Future modules such as templates, generation, and premium admin tools can reuse these middleware without duplicating membership logic.

## Subscription Statuses

The business engine supports:

- `active`
- `trial`
- `grace_period`
- `paused`
- `expired`
- `cancelled`
- `on_hold`
- `revoked`
- `pending`

The user model still retains legacy-compatible values such as `inactive` and `past_due` where needed.

## Plan Lifecycle

The engine is prepared for:

- upgrade
- downgrade
- renew
- expire
- pause
- resume
- cancel
- trial
- future gift subscription

These lifecycle events are written into `User.subscription.history`.

## Upgrade And Downgrade Flow

This phase prepares the transition rules but does not connect them to billing yet.

When billing integration is added later:

1. Billing verifies entitlement
2. Membership engine validates plan transition
3. User subscription is updated
4. Feature snapshot is refreshed
5. History entry is stored
6. Notifications are triggered

## Expiry Flow

The scheduler placeholder is prepared for a future flow:

1. Find subscriptions nearing expiry
2. Notify user
3. Move to grace period when applicable
4. Mark expired when grace ends
5. Disable premium features

## Database Design

This phase keeps backward compatibility by extending the existing user subscription object with:

- plan version
- feature snapshot
- limits snapshot
- renewal count
- transition timestamps
- embedded history

Plans remain in `AppSetting.subscriptionPlans`, which now support versioning, premium flags, feature flags, limits, and transition settings.

## APIs

- `GET /api/v1/subscription/current`
- `GET /api/v1/subscription/plans`
- `GET /api/v1/subscription/history`
- `GET /api/v1/membership/features`
- `POST /api/v1/membership/check-feature`

Backward-compatible `/api/v1/subscriptions` access remains mounted.

## Future Ready

Prepared for:

- family plan
- creator plan
- enterprise plan
- promo subscription
- gift subscription
- coupon subscription
- regional pricing
- student discount
