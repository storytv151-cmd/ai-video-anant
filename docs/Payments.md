# Google Play Payment Architecture

## Scope

This phase adds payment architecture only for an Android application that uses Google Play Billing exclusively.

- No Google Play Developer API integration yet
- No credit granting logic yet
- No subscription activation logic yet
- No external payment gateways

The goal is to prepare the backend for Phase-10B without breaking existing modules.

## Supported Payment Types

- One-time credit purchase
- Subscription purchase

Credit purchases map to Google Play `inapp` products.

Subscriptions map to Google Play `subs` products and future base-plan or offer combinations.

## Purchase Lifecycle

1. Android starts purchase through Google Play Billing Library.
2. Google Play returns purchase success on device.
3. Android sends `purchaseToken`, `productId`, `paymentType`, and related metadata to `POST /api/v1/payment/google/verify`.
4. Backend validates request shape and checks duplicate-protection fields.
5. Backend will call Google Play Developer API in Phase-10B.
6. On successful verification in Phase-10B, backend will:
   - create a `Payment` record
   - grant credits or activate subscription
   - write wallet or user updates
   - create credit transactions where applicable
   - write audit logs

Phase-10A stops before step 5 is implemented.

## Subscription Lifecycle

1. Android purchases a subscription product through Google Play Billing.
2. Backend receives purchase verification request.
3. Backend will verify Google purchase state in Phase-10B.
4. On success in Phase-10B, backend will update `User.subscription` with:
   - plan code
   - product id
   - base plan id
   - offer id
   - auto renew state
   - expiry
   - premium features
   - last verification timestamp

Current architecture supports statuses such as:

- `inactive`
- `trial`
- `active`
- `past_due`
- `cancelled`
- `expired`
- `paused`
- `grace_period`
- `on_hold`
- `revoked`

## Purchase States

The payment architecture is prepared for these Google-oriented states:

- `pending`
- `purchased`
- `acknowledged`
- `consumed`
- `cancelled`
- `expired`
- `refunded`
- `revoked`
- `paused`
- `grace_period`
- `on_hold`

`purchaseStateService` normalizes and classifies these states for future business logic.

## Wallet Integration

One-time purchases will eventually follow this flow:

1. Verify purchase with Google
2. Create `Payment`
3. Create `CreditTransaction`
4. Update `Wallet`
5. Write `AuditLog`

This phase only prepares the schema relationships and service boundaries for that flow.

## Current API Surface

### Payment

- `GET /api/v1/payment/packages`
- `POST /api/v1/payment/google/verify`
- `POST /api/v1/payment/restore`
- `GET /api/v1/payment/history`

Plural compatibility is preserved through `/api/v1/payments`.

### Subscription

- `GET /api/v1/subscriptions`
- `GET /api/v1/subscription/current`

Singular and plural mounting are both supported for compatibility and future clarity.

## Settings Strategy

Everything is database-driven through `AppSetting`, primarily `PAYMENTS`.

Prepared configuration areas include:

- Google Play enablement and package metadata
- credit packages
- subscription plans
- trial settings
- offer settings
- taxes
- country pricing
- future pricing structures

Nothing is hardcoded into controllers.

## Duplicate Protection

The architecture prepares for strict deduplication with:

- `purchaseTokenHash`
- `orderId`

The `Payment` model includes unique indexes for both fields scoped to Google Play platform records.

## Fraud Protection

Phase-10A prepares the following protections without implementing remote verification yet:

- replay attack prevention through dedupe keys
- fake token detection hook through `googlePurchaseValidator`
- refund and revoke state handling through purchase-state mapping
- verification attempt tracking
- audit trail readiness

## RTDN Preparation

Future Real-time Developer Notifications flow:

1. Google sends RTDN event to Pub/Sub
2. Backend consumer receives event
3. Event is verified and mapped to payment or subscription record
4. Backend refreshes Google purchase state
5. Backend updates `Payment` and `User.subscription`
6. Backend writes audit log and reconciliation records

Phase-10A only prepares settings and state handling for this future workflow.

## Files Added In This Phase

- payment architecture services
- Google Play validator placeholder
- purchase state service
- payment and subscription controllers
- payment and subscription routes
- payment and subscription validators

## Phase-10B Responsibilities

Phase-10B will implement:

- Google Play Developer API calls
- verified payment persistence
- credit granting
- subscription activation
- acknowledgement and consumption handling
- restore logic
- RTDN ingestion
