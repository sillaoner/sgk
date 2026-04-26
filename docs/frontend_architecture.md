# Frontend Architecture

## Stack

- Next.js (App Router) + TypeScript strict mode
- Tailwind CSS
- React Hook Form + Zod
- Zustand auth/session state
- Axios API abstraction with interceptors

## Folders

- `app`: routes and layouts
- `components`: UI and feature components
- `services/api`: typed API modules
- `services/offline`: cache + retry queue
- `hooks`: auth and offline-sync hooks
- `store`: global state (auth)
- `types`: shared domain contracts
- `lib`: helpers, env, constants

## Offline Strategy

- Read caching via `localStorage`
- Mutation queue on network failures
- Auto-retry on `online` event and interval
- Optional idempotency key via `X-Idempotency-Key`

## Security Controls

- Route protection via Next middleware + role cookies
- API token in session persistence
- CSP and security headers in `next.config.ts`
- Avoid direct HTML injection (`dangerouslySetInnerHTML` not used)
