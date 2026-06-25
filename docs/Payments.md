# Google Play Payment Engine

## Scope

The backend now implements a production-ready one-time Google Play credit purchase engine.

- Google Play verification happens only on the backend
- Credits are granted only after Google verification succeeds
- Duplicate protection is enforced before settlement
- Wallet updates and payment persistence happen transactionally
- Subscription activation is still deferred to a later phase

## Supported Scope In This Phase

- One-time credit purchases through Google Play `inapp` products
- Restore flow for missing one-time purchases
- Payment history and payment detail lookup

Not implemented in this phase:

- subscription verification and activation
- RTDN ingestion
- refund reconciliation jobs

## Verification Flow

1. Android completes purchase with Google Play Billing Library.
2. Android sends `purchaseToken`, `productId`, optional `orderId`, and package metadata to `POST /api/v1/payment/google/verify`.
3. Backend validates the request shape.
4. Backend resolves the matching credit package from `AppSetting`.
5. Backend verifies the purchase against Google Play Developer API using service-account credentials.
6. Backend validates:
   - package name
   - product id
   - order id
   - purchase state
   - acknowledgement state
   - consumption state
   - purchase time
   - region code
7. Backend checks duplicate protection.
8. Backend creates or reuses the `Payment` record.
9. Backend grants credits through the wallet engine.
10. Backend stores the Google response and verification metadata.
11. Backend optionally acknowledges and consumes the purchase when configured.
12. Backend writes audit logs and returns the settled payment result.

## Google API Integration

The engine uses Google Play Android Developer API for in-app purchases:

- purchase status lookup
- optional acknowledge action
- optional consume action

Credentials are read only from environment variables:

- `GOOGLE_SERVICE_ACCOUNT_JSON`
- `GOOGLE_PLAY_PACKAGE_NAME`
- `GOOGLE_PLAY_APP_ID`

Credentials are never returned to clients and are never trusted from request payloads.

## Duplicate Protection

Before credits are granted, the backend checks:

- `purchaseTokenHash`
- `orderId`
- `googlePurchaseId`
- request idempotency key

The `Payment` model enforces unique indexes for the Google identifiers, and wallet settlement uses a fixed idempotency key derived from the purchase identity. This prevents replay grants even if the same purchase is retried with a different client request key.

If an already-processed purchase is retried, the API returns the existing payment instead of granting credits again.

## Settlement Flow

1. Google verification succeeds
2. Matching credit package is resolved from database settings
3. MongoDB transaction starts
4. `Payment` is created or resumed
5. `walletService.addCredits()` creates the `CreditTransaction` and updates the wallet atomically
6. `Payment` is updated with transaction linkage and verification metadata
7. Transaction commits
8. Post-settlement Google acknowledge or consume runs as a follow-up action

The wallet remains the single source of truth for credit mutations.

## Purchase States

The engine currently supports these normalized states:

- `pending`
- `purchased`
- `acknowledged`
- `consumed`
- `cancelled`
- `refunded`
- `revoked`
- `expired`
- `failed`

For one-time purchases:

- `pending` is rejected for settlement
- `cancelled`, `refunded`, `revoked`, `expired`, and `failed` are rejected
- `consumed` without an existing successful local payment is treated as non-settlable

## Fraud Detection

The engine actively checks for:

- replay purchase attempts
- modified purchase tokens
- package mismatch
- invalid product configuration
- order ID mismatch
- consumed purchase replay
- cancelled or otherwise non-settlable purchase states

It also never trusts:

- client price
- client currency
- client credit amount

Price, currency, and granted credits always come from `AppSetting` package configuration.

## Restore Flow

`POST /api/v1/payment/restore` accepts either:

- `purchases[]` with `purchaseToken`, `productId`, optional `orderId`, and optional `packageName`
- legacy parallel arrays for backward compatibility

Each purchase is verified independently. Missing verified purchases are granted, and already-processed purchases are returned as existing results.

## Stored Metadata

`Payment` now stores:

- Google response payload
- verification time
- request ID
- request idempotency key
- IP and user agent
- device metadata
- wallet-linked credit transaction
- product and package metadata
- acknowledgement and consumption state

## API Surface

- `GET /api/v1/payment/packages`
- `POST /api/v1/payment/google/verify`
- `POST /api/v1/payment/restore`
- `GET /api/v1/payment/history`
- `GET /api/v1/payment/:id`

Plural compatibility remains available through `/api/v1/payments`.

Subscription read-only endpoints from the previous phase remain in place, but subscription settlement is not part of this phase.

## RTDN Preparation

Future Real-time Developer Notifications flow will:

1. receive Pub/Sub notifications
2. re-fetch Google purchase state
3. reconcile local `Payment` records
4. handle refunds, revokes, and delayed settlements
5. update subscription state in a later subscription phase

## Remaining Future Work

- subscription verification and activation
- refund and revoke reconciliation jobs
- RTDN ingestion worker
- administrative payment reconciliation tooling
