# Offline-First Sync Logic (React Native + SQLite -> PostgreSQL)

```text
DATA STRUCTURES (SQLite)
  incidents_local(
    local_id TEXT PK,
    server_id TEXT NULL,
    payload_json TEXT NOT NULL,
    sync_state TEXT NOT NULL,        -- dirty | syncing | synced | conflict
    local_version INTEGER NOT NULL,
    server_version INTEGER NULL,
    updated_at_utc TEXT NOT NULL
  )

  sync_queue(
    op_id TEXT PK,                   -- UUID (idempotency key)
    entity_type TEXT NOT NULL,       -- incident | analysis | action
    entity_local_id TEXT NOT NULL,
    op_type TEXT NOT NULL,           -- create_draft | update_details | add_photos | submit | upsert_analysis | ...
    payload_json TEXT NOT NULL,
    created_at_utc TEXT NOT NULL,
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT NULL
  )

  sync_state(
    key TEXT PK,
    value TEXT NOT NULL              -- last_pull_token, last_successful_sync_at, etc.
  )

ALGORITHM: ON LOCAL WRITE (ONLINE OR OFFLINE)
  BEGIN TRANSACTION
    1) Upsert entity in incidents_local (or analysis/action local table)
    2) Increment local_version
    3) Insert one row to sync_queue with new op_id and full payload snapshot
    4) Mark entity sync_state = dirty
  COMMIT

ALGORITHM: BACKGROUND SYNC WORKER (runs every N sec + network regained)
  IF no network THEN return
  IF no valid access token THEN refresh token; if refresh fails, pause sync

  ACQUIRE mutex "sync-lock"
  TRY
    PHASE A: PULL SERVER CHANGES FIRST
      1) read last_pull_token from sync_state
      2) GET /sync/changes?since=last_pull_token
      3) for each server item:
           find local row by server_id
           if local row does not exist:
             insert local copy with sync_state=synced
           else if local row is dirty:
             resolve conflict using policy:
               - if server status is closed, server wins (immutable closed record)
               - else compare versions/updated_at
               - if conflict unresolved, set sync_state=conflict and keep both copies for UI review
           else:
             overwrite local copy with server payload
      4) store new pull token

    PHASE B: PUSH LOCAL QUEUE
      1) read sync_queue ordered by created_at_utc ASC
      2) for each op:
           set related entity sync_state = syncing
           call mapped endpoint with header Idempotency-Key = op_id
           if success:
             - update entity server_id / server_version from response
             - set entity sync_state = synced (unless newer dirty version exists)
             - delete op from sync_queue
           else if retriable (timeout, 5xx, 429):
             - increment retry_count
             - apply exponential backoff
             - keep row in queue
           else if conflict (409):
             - mark entity sync_state = conflict
             - store error detail in last_error
             - keep row for manual/assisted resolution
           else if unauthorized (401/403):
             - stop loop; force re-auth
           else:
             - store last_error and continue next item

    PHASE C: POST-SYNC ACTIONS
      1) update sync_state.last_successful_sync_at
      2) notify UI observers so incident lists refresh
  FINALLY
    RELEASE mutex "sync-lock"

CONFLICT RESOLUTION POLICY
  - Incident transitions are monotonic: open -> analysis -> closed only.
  - closed incidents are read-only on mobile (no local edits allowed).
  - For photos: merge unique URLs set-union.
  - For analysis causes/action items: field-level merge if untouched locally; otherwise mark conflict.
  - Always preserve auditability: never hard-delete conflicting payloads.

SECURITY NOTES (KVKK/GDPR)
  - Encrypt sensitive local columns with key from iOS Keychain / Android Keystore.
  - Never cache decrypted personal health data longer than active screen session.
  - Send minimal payloads; redact health payload unless endpoint requires it.
  - Log access to health payload read operations in server-side access_logs.
```
