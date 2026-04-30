# Freelance Platform Backend

Freelance job and project tracking platform backend built with NestJS, Prisma, and MySQL.

## Project
This API manages the full freelance workflow: authentication, job posting, bidding, project tracking, milestones, deliveries, payments, and disputes.

## Technologies
- NestJS
- Prisma ORM
- MySQL
- JWT + Passport
- Swagger

## Quick Setup
1. Install dependencies:
```bash
npm install
```
2. Prepare environment:
```bash
cp .env.example .env
```
3. Start MySQL with Docker:
```bash
docker compose up -d
```
4. Run Prisma migrations and generate client:
```bash
npm run prisma:generate
npm run prisma:migrate
```
5. Start app:
```bash
npm run start:dev
```

## Swagger
- URL: `http://localhost:3000/docs`

## Main Modules
- auth
- jobs
- bids
- projects
- milestones
- deliveries
- payments
- disputes

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
