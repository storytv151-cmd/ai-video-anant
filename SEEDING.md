# Database Seeding Framework

The seeding framework prepares a fresh or existing MongoDB database with all default configurations, membership plans, credit packages, providers, models, categories, feature toggles, rewards settings, and default administrator credentials.

---

## Command Operations

### 1. Standard Seeding

Populate all default tables safely. This operation is idempotent and will skip existing records or only add missing properties/documents:

```bash
npm run seed
```

### 2. Force Reseed

Deletes existing seeded configurations/documents and recreates them from scratch back to default state:

```bash
npm run reseed
```

### 3. Seed Super Admin Only

Seed only the default Super Admin user account and associated wallet, skipping other operational setups:

```bash
npm run seed:admin
```

---

## Seeded Parameters Overview

1. **App Settings (`GENERAL:global`)**: Standard upload limits, default currency set to `INR`, force update disabled, DO Spaces enabled, default concurrent limits.
2. **Membership Plans (`PAYMENTS:global`)**: Seeds `free`, `premium_monthly`, and `premium_yearly` plans.
3. **Credit Packages (`PAYMENTS:global`)**: Packs for 100, 250, 500, 1000, and 2500 credits.
4. **Providers**: Default healthy profiles for `Nano Banana`, `Kling`, `Runway`, `Pika`, and `Luma`.
5. **Provider Models**: Model suites like Runway `Gen4` and `Turbo`, Luma `Dream` and `Dream Pro`, Pika `Pro` and `Standard`.
6. **Template Categories**: 20 categories including `Trending`, `Anime`, `Cinematic`, `AI Avatar`, etc.
7. **Feature Toggles (`FEATURES:global`)**: Configures options like reward ads, referral, premium templates, face swaps, upscale, background removal.
8. **Reward Settings (`REWARDS:global`)**: Welcome bonus (50), Ad reward (10), daily limits (10 views), checkin streak rewards.
9. **Platform Coupons**: Active codes `WELCOME50` (50% off), `NEWUSER100` (100 credits), `PREMIUM20` (20% off), `TEST100` (flat 100).
10. **Super Admin**: Credentials for `admin@example.com` (Super Admin role, active account status, fully linked wallet with 100,000 credits).

---

## Idempotency Details

All seed runners are designed with idempotency checks:

- Standard models are looked up by unique keys (e.g. `slug` or `code`). Missing ones are created; existing ones are checked for missing fields and updated without altering user-customized configurations.
- Super Admin creation checks for `admin@example.com`. If present, it will not modify or reset the admin's wallet.
