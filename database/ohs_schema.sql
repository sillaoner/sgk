-- MetalForm A.S. OHS Incident Management Schema (PostgreSQL)
-- Covers incident reporting, root-cause analysis, action tracking,
-- legal reporting, privacy/audit requirements, and event outbox support.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- =============
-- Enumerations
-- =============
CREATE TYPE user_role AS ENUM ('ohs', 'supervisor', 'manager', 'hr');
CREATE TYPE incident_type AS ENUM ('accident', 'near_miss');
CREATE TYPE incident_status AS ENUM ('open', 'analysis', 'closed');
CREATE TYPE analysis_category AS ENUM (
    'human',
    'machine',
    'method',
    'material',
    'measurement',
    'environment',
    'management',
    'other'
);
CREATE TYPE action_status AS ENUM ('pending', 'completed');
CREATE TYPE legal_report_type AS ENUM ('sgk', 'ministry');

-- =================
-- Shared utilities
-- =================
CREATE OR REPLACE FUNCTION set_row_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- ==========================
-- Core reference dimensions
-- ==========================
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_name TEXT NOT NULL,
    building TEXT,
    line_name TEXT,
    floor TEXT,
    area_code TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (site_name, building, line_name, floor, area_code)
);

-- =========
-- Identity
-- =========
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    role user_role NOT NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    phone VARCHAR(32) NOT NULL,
    email CITEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (email)
);

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();

-- =========================
-- Incident and investigation
-- =========================
CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type incident_type NOT NULL,
    date_time TIMESTAMPTZ NOT NULL,
    location_id UUID REFERENCES locations(id),
    reporter_id UUID NOT NULL REFERENCES users(id),
    description TEXT,
    status incident_status NOT NULL DEFAULT 'open',
    photo_urls JSONB NOT NULL DEFAULT '[]'::JSONB,

    -- Supports 3-step mobile reporting workflow.
    is_draft BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CHECK (jsonb_typeof(photo_urls) = 'array'),
    CHECK (is_draft OR location_id IS NOT NULL),
    CHECK (is_draft OR description IS NOT NULL)
);

CREATE TRIGGER trg_incidents_updated_at
BEFORE UPDATE ON incidents
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();

-- Personal health data is never stored in plaintext.
-- Application-side AES-256-GCM encryption is recommended;
-- this table stores only encrypted material and key version.
CREATE TABLE incident_health_payloads (
    incident_id UUID PRIMARY KEY REFERENCES incidents(id) ON DELETE CASCADE,
    ciphertext BYTEA NOT NULL,
    iv BYTEA NOT NULL,
    auth_tag BYTEA NOT NULL,
    key_version INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE root_cause_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL UNIQUE REFERENCES incidents(id) ON DELETE CASCADE,
    cause_1 TEXT NOT NULL,
    cause_2 TEXT,
    cause_3 TEXT,
    cause_4 TEXT,
    cause_5 TEXT,
    category analysis_category NOT NULL,

    -- Fishbone branches can be kept as structured JSON.
    fishbone_json JSONB NOT NULL DEFAULT '{}'::JSONB,

    analyst_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (jsonb_typeof(fishbone_json) = 'object')
);

CREATE TRIGGER trg_root_cause_analyses_updated_at
BEFORE UPDATE ON root_cause_analyses
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();

CREATE TABLE actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID NOT NULL REFERENCES root_cause_analyses(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    responsible_id UUID NOT NULL REFERENCES users(id),
    end_date DATE NOT NULL,
    status action_status NOT NULL DEFAULT 'pending',
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES users(id),
    ohs_approval_at TIMESTAMPTZ,
    ohs_approved_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK ((status = 'pending' AND completed_at IS NULL)
        OR (status = 'completed' AND completed_at IS NOT NULL))
);

CREATE TRIGGER trg_actions_updated_at
BEFORE UPDATE ON actions
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();

-- ======================
-- Legal/Regulatory output
-- ======================
CREATE TABLE legal_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type legal_report_type NOT NULL,
    period DATERANGE NOT NULL,
    pdf_url TEXT NOT NULL,
    generated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    checksum_sha256 CHAR(64),
    CHECK (lower(period) < upper(period)),
    UNIQUE (type, period)
);

-- =========================
-- KVKK/GDPR access auditing
-- =========================
CREATE TABLE access_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    action TEXT NOT NULL,
    reason TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (entity_type IN ('incident', 'analysis', 'action', 'legal_report', 'user')),
    CHECK (action IN ('create', 'read', 'update', 'delete', 'export', 'approve', 'close'))
);

-- ============================================
-- Outbox table for microservice event publishing
-- ============================================
CREATE TABLE outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type TEXT NOT NULL,
    aggregate_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ,
    retry_count INTEGER NOT NULL DEFAULT 0
);

-- =======
-- Indexes
-- =======
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_incidents_status_date ON incidents(status, date_time DESC);
CREATE INDEX idx_incidents_reporter ON incidents(reporter_id);
CREATE INDEX idx_incidents_location ON incidents(location_id);
CREATE INDEX idx_root_cause_analyses_incident ON root_cause_analyses(incident_id);
CREATE INDEX idx_actions_analysis ON actions(analysis_id);
CREATE INDEX idx_actions_responsible_status ON actions(responsible_id, status);
CREATE INDEX idx_actions_due ON actions(end_date) WHERE status = 'pending';
CREATE INDEX idx_legal_reports_type_period ON legal_reports(type, period);
CREATE INDEX idx_access_logs_entity ON access_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_access_logs_actor ON access_logs(actor_user_id, created_at DESC);
CREATE INDEX idx_outbox_unpublished ON outbox_events(occurred_at) WHERE published_at IS NULL;

-- ==================================
-- EF Core migration history baseline
-- ==================================
CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    migration_id VARCHAR(150) PRIMARY KEY,
    product_version VARCHAR(32) NOT NULL
);

INSERT INTO "__EFMigrationsHistory" (migration_id, product_version)
VALUES
    ('20260502212253_InitialCreate', '8.0.8'),
    ('20260502212302_AddIncidentAndAnalysis', '8.0.8')
ON CONFLICT (migration_id) DO NOTHING;
