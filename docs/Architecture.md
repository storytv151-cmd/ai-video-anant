# Architecture

## Overview

This backend follows a controller/service/model structure:

- Controllers: HTTP orchestration only (thin).
- Services: business logic and orchestration.
- Models: Mongoose schema definitions only.
- Middleware: cross-cutting concerns (auth, validation, logging, errors).

## Layers

- Controllers must not return raw Mongoose documents where they can contain internal fields; return DTOs or projected lean objects.
- Services should use MongoDB transactions for wallet/generation settlement and other multi-document invariants.

## Request Flow

### Request Tracing

- Every request has an `X-Request-ID` (client-provided or generated).
- Logs include request-scoped context such as requestId, userId, generationJobId, walletTransactionId.

### Audit Logging

- Security-relevant events and money/credits events write `AuditLog` entries with actor, action, target, requestId, ip, and metadata.
