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

## APIs

- `GET /api/v1/wallet`
- `GET /api/v1/wallet/history`
- `GET /api/v1/wallet/summary`
- `POST /api/v1/wallet/promo`
- `POST /api/v1/reward/daily`
- `POST /api/v1/reward/ad`

## Future Extensions

This module is designed to support future phases:

- payment gateway confirmations (pending -> balance)
- subscription-based monthly credits
- gift credits / marketplace credits
- team / family wallets

