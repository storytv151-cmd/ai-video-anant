# Google Subscription Engine Test Cases

These are placeholder test scenarios prepared for the Google Play subscription engine.

## Purchase

- verify a newly purchased subscription token activates premium membership
- verify acknowledgement is requested only when Google reports pending acknowledgement
- verify configured plan mapping is used instead of client pricing

## Renewal

- verify a renewed subscription extends expiry and increments renewal count
- verify RTDN renewal event updates latest order id and keeps premium enabled

## Cancel

- verify a cancelled subscription keeps premium access until expiry
- verify cancellation history is written without deleting entitlement early

## Expire

- verify an expired subscription disables premium features immediately
- verify status sync updates the user to `expired`

## Pause

- verify a paused subscription disables premium access
- verify pause timestamps and history entries are recorded

## Resume

- verify resumed or recovered subscriptions re-enable premium features
- verify resumed subscriptions update sync metadata and history

## Restore

- verify restore processes multiple subscription tokens safely
- verify invalid tokens fail without blocking valid restore items

## RTDN Events

- verify purchased RTDN event creates or updates membership
- verify renewed RTDN event extends expiry
- verify cancelled RTDN event preserves access until expiry
- verify expired RTDN event revokes premium
- verify revoked RTDN event revokes premium immediately
- verify grace-period RTDN event preserves premium
- verify on-hold RTDN event disables premium

## Duplicate Notifications

- verify duplicate Pub/Sub `messageId` is ignored
- verify repeated purchase token notifications do not double-process membership or payment state

## Fraud Checks

- verify package mismatch is rejected
- verify product mismatch is rejected
- verify country mismatch is rejected when plan countries are configured
- verify subscription token already linked to another user is rejected
