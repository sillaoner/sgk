# MetalForm OHS Platform

Full-stack OHS incident management platform with:

- ASP.NET Core backend (`backend/Ohs.Api`)
- Next.js + TypeScript frontend (`frontend`)
- PostgreSQL schema (`database/ohs_schema.sql`)
- Docker Compose stack and CI/CD pipeline

## Quick Start (Development)

1. Copy env template:

```bash
cp .env.dev.example .env
cp frontend/.env.example frontend/.env.local
```

2. Run with Docker:

```bash
docker compose up --build
```

3. Access apps:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8080`
- Swagger: `http://localhost:8080/swagger`

## Dev Login Accounts

- Password (all seeded users): value of `AUTH_DEMO_PASSWORD` in `.env`
- `ohs@metalform.local`
- `supervisor@metalform.local`
- `manager@metalform.local`
- `hr@metalform.local`

## Local Build Commands

### Backend

```bash
cd backend/Ohs.Api
dotnet build
```

### Frontend

```bash
cd frontend
npm ci
npm run lint
npm run typecheck
npm run build
```

## Deployment

See [deployment_guide.md](/Users/silaoner/sgk/docs/deployment_guide.md).
