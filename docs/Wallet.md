# Wallet & Credit Engine

## Purpose

The Wallet Engine is the single authority for credit movements across the platform. No other module should modify wallet balances directly.

## Core Principle (Ledger Safety)

Every credit operation must follow:

1. Validate request and wallet invariants
2. Create `CreditTransaction` ledger entry
3. Update `Wallet` balances and totals
4. Commit the database transaction
5. Return response

This ensures that there is always a complete history for every balance change.

## Credit Lifecycle

- `pendingCredits`: credits awaiting confirmation (payments, reward verification, referral validation)
- `currentCredits`: spendable credits
- `lockedCredits`: reserved credits during in-progress generation

## Refund Flow

Refunds must be issued by creating a refund `CreditTransaction` that references the original transaction, followed by a wallet update.

## Idempotency

Every wallet-changing operation supports an `Idempotency-Key` header. The key is stored on `CreditTransaction.idempotencyKey` with a uniqueness constraint per user.

- Duplicate requests return the existing credit transaction and do not execute the mutation twice.
- Generation-related settlement uses derived keys scoped to `(jobId, retryCount, action)` to prevent duplicate lock/consume/unlock.

## APIs

- `GET /api/v1/wallet`
- `GET /api/v1/wallet/history`
- `GET /api/v1/wallet/summary`
- `POST /api/v1/wallet/promo`
- `POST /api/v1/reward/daily`
- `POST /api/v1/reward/ad`

## Generation Settlement

Wallet credits are never mutated directly by the generation module. Generation calls the Wallet Engine through settlement steps:

- Lock credits at generation start.
- Consume locked credits on completion.
- Unlock locked credits on failure/cancel/timeout.

## Future Extensions

This module is designed to support future phases:

- payment gateway confirmations (pending -> balance)
- subscription-based monthly credits
- gift credits / marketplace credits
- team / family wallets
