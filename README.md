# AI Video Generation Platform Backend

Phase-1 foundation for a production-ready, enterprise-grade Node.js backend for a large-scale AI video generation platform. This scaffold focuses on architecture, infrastructure, environment management, observability, routing, and extension points for future phases.

## Project Overview

This project establishes a stable backend foundation using:

- Node.js Latest LTS
- Express.js
- JavaScript ES Modules
- MongoDB Atlas with Mongoose
- Winston logging with rotating files
- Helmet, CORS, compression, rate limiting, and cookie parsing
- Clean Architecture principles with MVC plus Service Layer

Phase-1 intentionally excludes:

- Authentication and authorization implementation
- Wallet and payment business logic
- Template management
- AI provider integration logic
- Domain-specific business workflows

## Folder Structure

```text
backend/
├── logs/
├── public/
├── src/
│   ├── config/
│   │   ├── database.js
│   │   ├── environment.js
│   │   └── logger.js
│   ├── constants/
│   │   └── index.js
│   ├── controllers/
│   │   └── health.controller.js
│   ├── cron/
│   │   └── index.js
│   ├── jobs/
│   │   └── index.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   ├── notFound.js
│   │   ├── rateLimiter.js
│   │   ├── requestLogger.js
│   │   ├── upload.js
│   │   └── validation.js
│   ├── models/
│   │   └── index.js
│   ├── routes/
│   │   ├── health.routes.js
│   │   └── index.js
│   ├── services/
│   │   ├── notification/
│   │   │   └── index.js
│   │   ├── payment/
│   │   │   └── index.js
│   │   ├── storage/
│   │   │   └── index.js
│   │   ├── videoProviders/
│   │   │   └── index.js
│   │   ├── wallet/
│   │   │   └── index.js
│   │   ├── index.js
│   │   └── system.service.js
│   ├── utils/
│   │   ├── ApiError.js
│   │   ├── ApiResponse.js
│   │   ├── asyncHandler.js
│   │   ├── constants.js
│   │   └── responseFormatter.js
│   ├── validators/
│   │   └── index.js
│   ├── app.js
│   └── server.js
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Architecture

This scaffold uses a pragmatic enterprise structure:

- Controllers stay thin and handle only HTTP concerns.
- Services own orchestration and non-trivial runtime behavior.
- Models are reserved for schema definitions only.
- Middleware handles cross-cutting concerns such as errors, uploads, logging, validation, and throttling.
- Config modules centralize environment loading, logging, and database lifecycle.
- Routes remain versioned so future APIs can evolve without breaking existing clients.

### Request Flow

1. `server.js` loads configuration and starts the HTTP server.
2. `app.js` wires middleware, request parsing, security, and routes.
3. Routes invoke controllers.
4. Controllers delegate to services.
5. Services return data to controllers.
6. Centralized middleware formats success and error responses.

## API Endpoints

The scaffold exposes the following foundation endpoints:

- `GET /`
- `GET /health`
- `GET /api/v1`

Each endpoint returns server metadata including:

- environment
- version
- timestamp
- uptime
- database connection status

## Installation

```bash
cd backend
npm install
```

## Environment

1. Copy `.env.example` to `.env`.
2. Fill in the values required for your environment.
3. At minimum, define `PORT` and `MONGO_URI` for a real deployment.

Example:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

## Development

```bash
cd backend
npm install
npm run dev
```

## Production

```bash
cd backend
npm install --omit=dev
npm run start
```

Recommended production steps:

- Set `NODE_ENV=production`
- Provide a valid MongoDB Atlas URI
- Configure log retention and external monitoring
- Run behind a reverse proxy or load balancer
- Set trusted proxy configuration correctly

## Scripts

- `npm run dev` starts the server with `nodemon`
- `npm run start` starts the production server
- `npm run lint` runs ESLint across JavaScript files
- `npm run format` runs Prettier across the project

## Configuration Notes

- `src/config/environment.js` is the single source of truth for runtime configuration.
- `src/config/logger.js` exposes application, HTTP, and error loggers.
- `src/config/database.js` manages MongoDB connectivity and state inspection.
- `src/middleware/upload.js` prepares memory-based uploads for future storage workflows.
- `src/validators/index.js` provides a scalable validation entry point for future modules.

## Future Phases

Planned future iterations can build on this foundation without redesigning the architecture:

- Authentication and authorization
- User management
- Wallet and transaction systems
- Payment provider integration
- Template and asset management
- AI video provider adapters
- Notifications and messaging
- Background jobs, scheduling, and queue processing
- Observability, tracing, and production hardening

## Design Principles

- ES Modules only
- Async-first implementation style
- No business logic in controllers
- Environment-driven configuration
- Ready for horizontal growth and modular expansion
