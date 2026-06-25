# Repository Pattern

The repository layer will act as the abstraction boundary between the service layer and data persistence concerns.

## Purpose

- isolate database access details from services
- keep business orchestration independent from storage technology
- improve testability by allowing repository mocking and substitution
- support future complex query composition without leaking persistence concerns into controllers or services

## Future Scope

Future phases can add repositories per aggregate or module, such as users, wallets, templates, payments, and generation jobs.