# Deployment Guide

## 1) Prepare Environment

- Copy `.env.prod.example` to `.env` and fill production secrets.
- Set strong `JWT_SIGNING_KEY` and `ENCRYPTION_CURRENT_KEY`.
- Set `NEXT_PUBLIC_API_BASE_URL` to your backend public URL.

## 2) Frontend Deployment (Vercel)

1. Import `frontend` directory as a Vercel project.
2. Set env vars in Vercel:
   - `NEXT_PUBLIC_API_BASE_URL`
   - `NEXT_PUBLIC_APP_NAME`
3. Deploy branch `main`.
4. Point DNS to generated Vercel domain (or custom domain).

## 3) Backend Deployment (Docker VPS / Azure / AWS)

### Option A: Docker VPS

1. Provision Ubuntu VPS with Docker + Docker Compose.
2. Clone repository to `/opt/metalform-ohs`.
3. Copy production `.env` into repo root.
4. Start stack:

```bash
docker compose -f docker-compose.prod.yml up -d
```

5. Place reverse proxy (Nginx/Caddy) in front of backend and enable TLS.

### Option B: Azure Container Apps / AWS ECS

1. Build/push images to container registry.
2. Deploy backend image with env vars from `.env.prod.example`.
3. Deploy managed PostgreSQL (Azure Database for PostgreSQL / AWS RDS).
4. Update backend connection string and CORS origin.

## 4) CI/CD Setup (GitHub Actions)

Configure repository secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`

Pipeline file: `.github/workflows/ci-cd.yml`

## 5) Post-Deployment Hardening

- Restrict backend ingress to TLS only.
- Rotate JWT and encryption keys periodically.
- Enable DB backups and retention policy.
- Add centralized logs + alerts (Application Insights / CloudWatch / Grafana).
