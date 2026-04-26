# Backend API Structure (Microservices + API Gateway)

## Services

- `incident-service`
  - Owns incident creation, draft workflow, and incident lifecycle status.
  - Owns encrypted health payload metadata.
- `analysis-service`
  - Owns root cause analysis (Fishbone + 5 Whys) and corrective actions.
- `report-service`
  - Owns SGK/Ministry period reports and PDF production.
- `notification-service`
  - Owns in-app/push/email notification fan-out.
- `api-gateway`
  - JWT validation, RBAC, rate limiting, request correlation ID, and route forwarding.

## Gateway Route Map

- `POST /api/incidents/drafts` -> `incident-service`
- `PUT /api/incidents/drafts/{id}/details` -> `incident-service`
- `PUT /api/incidents/drafts/{id}/photos` -> `incident-service`
- `POST /api/incidents/drafts/{id}/submit` -> `incident-service`
- `PUT /api/incidents/{id}/analysis` -> `analysis-service`
- `POST /api/analyses/{id}/actions` -> `analysis-service`
- `POST /api/actions/{id}/complete` -> `analysis-service`
- `POST /api/actions/{id}/approve` -> `analysis-service`
- `POST /api/incidents/{id}/close` -> `analysis-service`
- `POST /api/reports/legal/generate` -> `report-service`
- `GET /api/reports/legal` -> `report-service`

## Security Controls

- JWT access token required at gateway.
- RBAC roles: `ohs`, `supervisor`, `manager`, `hr`.
- Sensitive endpoints require role checks both at gateway and service layer.
- Access of personal health payload must write `access_logs` record.

## Integration Pattern

- Each service writes integration events to `outbox_events` in its own transaction.
- Event relay publishes to message bus (Kafka/RabbitMQ) asynchronously.
- `notification-service` listens for:
  - `incident.reported`
  - `analysis.upserted`
  - `action.created`
  - `action.completed`
  - `incident.closed`
