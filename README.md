# Freelance Platform Backend

## Project Overview
Freelance Platform Backend is a NestJS + Prisma API that manages end-to-end freelance marketplace operations, including authentication, jobs, bidding, project execution, milestones, deliveries, payments, disputes, and reporting.

## Purpose
This project was built to provide a production-style backend foundation for a freelance marketplace with clear module boundaries, role-based workflows, and containerized local development.

## Features
- JWT-based authentication and role-aware authorization
- Job posting and bid submission flows
- Project lifecycle and milestone tracking
- Delivery and revision process management
- Payment release and refund operations
- Dispute creation, assignment, and resolution
- Reporting endpoints for dashboard-style analytics
- Swagger/OpenAPI documentation for API exploration

## Tech Stack
- Node.js
- NestJS
- Prisma ORM
- MySQL
- Swagger (OpenAPI)
- Docker / Docker Compose

## Architecture
The application follows a modular monolith approach:
- `src/modules/*`: Domain modules (`auth`, `jobs`, `bids`, `projects`, `milestones`, `deliveries`, `payments`, `disputes`, `reports`, `health`)
- `src/common/*`: Shared guards, decorators, filters, interceptors, middleware
- `src/prisma/*`: Database access layer and Prisma service wiring
- `prisma/*`: Schema, migrations, and seeding logic

## Folder Structure
```text
.
|-- src/
|   |-- common/
|   |-- modules/
|   `-- prisma/
|-- prisma/
|   |-- migrations/
|   |-- schema.prisma
|   `-- seed.ts
|-- scripts/
|-- docs/
|-- screenshots/
|-- frontend/
|-- docker-compose.yml
`-- README.md
```

## Prerequisites
- Node.js 20.x LTS (recommended)
- npm 10+
- Docker Desktop
- Docker Compose v2+

## Environment Variables
Create a local `.env` from `.env.example`:

```bash
cp .env.example .env
```

Typical variables used by this project:
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `PORT`

Use project-specific values from `.env.example` and your environment.

## Docker Setup
Run backend dependencies with Docker Compose:

```bash
docker compose up -d
```

Current known local ports:
- Backend: `3002`
- MySQL: `3307`
- Frontend: `5174`

Check container status:

```bash
docker compose ps
```

## Local Development Setup
Install dependencies and start development server:

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run start:dev
```

## Database & Prisma
Useful Prisma commands:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

Schema file: `prisma/schema.prisma`
Migrations: `prisma/migrations/*`

## API Documentation
Swagger UI is available at:
- [http://localhost:3002/docs](http://localhost:3002/docs)

Use it to inspect DTO schemas, auth requirements, and endpoint contracts.

## Example Endpoints
```http
POST /auth/register
POST /auth/login
GET  /jobs
POST /jobs/:jobId/bids
GET  /projects
POST /projects/:projectId/milestones
POST /milestones/:id/deliveries
POST /payments/:id/release
POST /projects/:projectId/disputes
GET  /health
```

## Screenshots
Screenshot placeholders are prepared in `screenshots/`.
The following visuals will be added:
- Swagger UI
- Frontend home page
- `docker compose ps` output
- Database/Prisma evidence

## Testing / Verification
Suggested verification flow:

```bash
docker compose up -d
npm run prisma:generate
npm run prisma:migrate
npm run start:dev
```

Then validate:
- Swagger opens at `http://localhost:3002/docs`
- Health endpoint responds (`GET /health`)
- Key module flows can be executed from Swagger

## Known Limitations
- No CI/CD pipeline configuration in this repository yet
- Automated test coverage is limited
- Some production hardening concerns (secret rotation, observability depth, rate policies) may require extension

## Future Improvements
- Add unit/integration/e2e test suites and CI workflows
- Improve audit logging and metrics/trace instrumentation
- Add stronger validation around payment/dispute edge cases
- Add deployment manifests and environment promotion strategy

## Contributors
- [enjinAI41](https://github.com/enjinAI41)

## License
This repository includes a `LICENSE` file. Review it before redistribution or commercial use.
