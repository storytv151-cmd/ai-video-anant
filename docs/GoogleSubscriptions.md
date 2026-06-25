# Google Play Subscription Engine

## Scope

This phase adds the full backend subscription verification and synchronization engine for Google Play subscriptions.

The backend is now responsible for:

- manual subscription verification
- restore flow
- verified status refresh
- renewal handling
- cancellation and expiry handling
- RTDN processing
- premium membership synchronization
- fraud checks

Google Play remains the billing source of truth. The Android client never decides subscription entitlement by itself.

## Google Play Flow

1. Android completes a Google Play subscription purchase.
2. Android sends `purchaseToken` and optional package or product metadata to `POST /api/v1/subscription/google/verify`.
3. Backend verifies the purchase using `purchases.subscriptionsv2.get`.
4. Backend resolves the matching subscription plan from `AppSetting.subscriptionPlans`.
5. Backend validates package, plan, region, token ownership, and identity linkage.
6. Backend acknowledges the subscription when required.
7. Backend synchronizes:
   - `User.subscription`
   - feature snapshots
   - premium access state
   - linked subscription `Payment` record
   - audit log
8. Backend returns the latest verified membership state.

## Subscription Lifecycle

The engine handles Google lifecycle states and maps them into local membership behavior:

- `active`
- `pending`
- `trial`
- `grace_period`
- `on_hold`
- `paused`
- `renewed`
- `cancelled`
- `expired`
- `revoked`

Important entitlement behavior:

- `active`, `trial`, `grace_period`, and `renewed` keep premium enabled
- `cancelled` keeps premium until the paid expiry time
- `paused`, `on_hold`, `expired`, and `revoked` disable premium immediately

## Verification Strategy

The backend does not verify every request.

Instead:

- `GET /api/v1/subscription/status` checks local verification freshness
- app-open synchronization can reuse the same freshness check against `lastVerifiedAt` and `nextVerificationAt`
- if the configured verification interval has passed, the backend re-verifies with Google
- otherwise it returns the latest cached verified subscription state

This keeps quota usage controlled while still correcting stale state when users open the app.

## RTDN Flow

1. Google Play publishes a subscription event to Cloud Pub/Sub.
2. Pub/Sub push sends the message to `POST /api/v1/google/rtdn/webhook`.
3. Backend validates the push request using:
   - Google-signed OIDC bearer token when configured
   - optional fallback shared token when explicitly configured
4. Backend decodes the base64 Pub/Sub payload.
5. Backend creates an idempotency ledger entry using Pub/Sub `messageId`.
6. Backend re-fetches the subscription from Google using the purchase token from the RTDN payload.
7. Backend updates membership and payment state using the same synchronizer as manual verification.
8. Backend writes an audit log and marks the webhook event as processed.

## Supported RTDN Events

The webhook maps and processes these Google subscription notifications:

- purchased
- renewed
- cancelled
- expired
- revoked
- paused
- resumed or restarted
- on hold
- in grace period
- recovered

Unknown or non-subscription RTDN messages are safely ignored after validation.

## Duplicate Protection

The engine prevents duplicate processing using:

- purchase token hash
- linked purchase token hash
- latest order id
- Google purchase id
- request idempotency keys
- RTDN Pub/Sub `messageId`

`GoogleWebhookEvent` acts as the RTDN delivery ledger so the same Pub/Sub message cannot be applied twice.

## Fraud Protection

The subscription engine validates:

- fake or invalid tokens through Google API verification
- package mismatch
- product mismatch
- base-plan mismatch
- country mismatch
- subscription ownership conflicts
- replayed tokens already linked to another user
- RTDN duplicates

It also prepares future placeholders for:

- device-abuse detection
- anomaly scoring
- advanced hijacking signals

## Restore Flow

`POST /api/v1/subscription/google/restore` accepts:

- `purchases[]`
- legacy `purchaseTokens[]` array input

Each purchase is independently verified with Google and then synchronized to the user membership state.

## Settings

The engine reads configuration from `AppSetting.payments.googlePlay`, including:

- subscription verification interval
- sync enablement
- sync on app open
- renewal retry count
- RTDN audience
- RTDN authorized emails
- RTDN verification token
- feature mapping

Nothing is hardcoded in controllers.

## Audit Coverage

The backend records audit events for:

- manual verification
- synchronization
- restore
- RTDN processing
- RTDN failures
- current subscription views

## Future Work

- periodic reconciliation job for missed RTDN messages
- refund and revoke recovery jobs
- advanced retry queues
- dead-letter processing for failed RTDN deliveries
- deeper subscription analytics
