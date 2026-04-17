-- ============================================================
-- ApprentiTrack – Database Schema  (15 tables)
-- ============================================================
-- SQLite-compatible schema for tracking apprenticeship
-- progress, evidence submissions, KSB competency coverage,
-- user authentication, interventions, audit logging, and
-- AI-powered chat conversations.
-- ============================================================

-- 1. Users – application accounts (admin, coach, apprentice)
CREATE TABLE IF NOT EXISTS users (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    email                TEXT    UNIQUE NOT NULL,
    password_hash        TEXT    NOT NULL,
    role                 TEXT    NOT NULL CHECK (role IN ('admin', 'coach', 'apprentice')),
    first_name           TEXT    NOT NULL,
    last_name            TEXT    NOT NULL,
    is_active            INTEGER DEFAULT 1,       -- boolean
    must_change_password INTEGER DEFAULT 1,       -- boolean
    apprentice_id        INTEGER REFERENCES apprentices(id),
    created_at           TEXT    DEFAULT (datetime('now'))
);

-- 2. Cohorts – groups of apprentices on the same programme intake
CREATE TABLE IF NOT EXISTS cohorts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,               -- e.g. "Sept 2024 Cohort"
    programme   TEXT    NOT NULL,               -- e.g. "Digital & Technology Solutions"
    start_date  TEXT    NOT NULL,               -- ISO date
    end_date    TEXT,
    created_at  TEXT    DEFAULT (datetime('now'))
);

-- 3. Coach–Cohort junction – maps coaches to their assigned cohorts
CREATE TABLE IF NOT EXISTS coach_cohorts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    cohort_id   INTEGER NOT NULL REFERENCES cohorts(id),
    UNIQUE (user_id, cohort_id)
);

-- 4. Apprentices – individual learners enrolled on a programme
CREATE TABLE IF NOT EXISTS apprentices (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name  TEXT    NOT NULL,
    last_name   TEXT    NOT NULL,
    email       TEXT    UNIQUE NOT NULL,
    cohort_id   INTEGER NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
    employer    TEXT,
    created_at  TEXT    DEFAULT (datetime('now'))
);

-- 5. Modules – units of learning within a programme
CREATE TABLE IF NOT EXISTS modules (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    code        TEXT    UNIQUE NOT NULL,        -- e.g. "IOT552U"
    title       TEXT    NOT NULL,
    credits     INTEGER,
    created_at  TEXT    DEFAULT (datetime('now'))
);

-- 6. Module–KSB junction – official programme-level KSB mapping per module
CREATE TABLE IF NOT EXISTS module_ksbs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    module_id   INTEGER NOT NULL REFERENCES modules(id),
    ksb_id      INTEGER NOT NULL REFERENCES ksbs(id),
    UNIQUE (module_id, ksb_id)
);

-- 7. Assessments – assessed work within a module
CREATE TABLE IF NOT EXISTS assessments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    module_id   INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    title       TEXT    NOT NULL,               -- e.g. "Data Modelling Report"
    description TEXT,
    due_date    TEXT,
    created_at  TEXT    DEFAULT (datetime('now'))
);

-- 8. KSBs – Knowledge, Skills and Behaviours defined by the standard
CREATE TABLE IF NOT EXISTS ksbs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    code        TEXT    UNIQUE NOT NULL,        -- e.g. "K1", "S3", "B2"
    type        TEXT    NOT NULL CHECK (type IN ('Knowledge', 'Skill', 'Behaviour')),
    description TEXT    NOT NULL,
    created_at  TEXT    DEFAULT (datetime('now'))
);

-- 9. Evidence Submissions – work submitted by apprentices
CREATE TABLE IF NOT EXISTS evidence_submissions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    apprentice_id   INTEGER NOT NULL REFERENCES apprentices(id) ON DELETE CASCADE,
    assessment_id   INTEGER REFERENCES assessments(id) ON DELETE CASCADE,
    module_id       INTEGER REFERENCES modules(id),
    title           TEXT,
    description     TEXT,                      -- main journal entry content
    file_url        TEXT,
    work_project    TEXT,                      -- name of work project if applicable
    submitted_at    TEXT    DEFAULT (datetime('now')),
    status          TEXT    DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'reviewed', 'accepted')),
    created_at      TEXT    DEFAULT (datetime('now'))
);

-- 10. Submission–KSB junction – maps evidence to competencies
CREATE TABLE IF NOT EXISTS submission_ksbs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id   INTEGER NOT NULL REFERENCES evidence_submissions(id) ON DELETE CASCADE,
    ksb_id          INTEGER NOT NULL REFERENCES ksbs(id) ON DELETE CASCADE,
    notes           TEXT,
    UNIQUE (submission_id, ksb_id)
);

-- 11. Coach Feedback – tutor/coach comments on submissions
CREATE TABLE IF NOT EXISTS coach_feedback (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id   INTEGER NOT NULL REFERENCES evidence_submissions(id) ON DELETE CASCADE,
    coach_name      TEXT    NOT NULL,
    rating          INTEGER CHECK (rating BETWEEN 1 AND 5),
    comments        TEXT,
    created_at      TEXT    DEFAULT (datetime('now'))
);

-- 12. Intervention Flags – flags raised for at-risk apprentices
CREATE TABLE IF NOT EXISTS intervention_flags (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    apprentice_id    INTEGER NOT NULL REFERENCES apprentices(id) ON DELETE CASCADE,
    reason           TEXT    NOT NULL,          -- e.g. "Low KSB coverage", "Overdue submissions"
    severity         TEXT    DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
    detail           TEXT,
    status           TEXT    DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
    raised_by        TEXT,                     -- coach name
    assigned_to      TEXT,
    action_notes     TEXT,
    resolution_notes TEXT,
    started_at       TEXT,
    resolved_at      TEXT,
    created_at       TEXT    DEFAULT (datetime('now'))
);

-- 13. Audit Log – tracks key user actions for security/compliance
CREATE TABLE IF NOT EXISTS audit_logs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp    TEXT    DEFAULT (datetime('now')) NOT NULL,
    user_id      INTEGER REFERENCES users(id),
    action       TEXT    NOT NULL,              -- e.g. "login", "create_user", "update_submission_status"
    target_type  TEXT,                          -- e.g. "user", "submission", "feedback"
    target_id    INTEGER,
    detail       TEXT,
    ip_address   TEXT
);

-- 14. Chat Conversations – AI assistant conversation sessions
CREATE TABLE IF NOT EXISTS chat_conversations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    title       TEXT,                          -- auto-generated from first message
    created_at  TEXT    DEFAULT (datetime('now')),
    updated_at  TEXT    DEFAULT (datetime('now'))
);

-- 15. Chat Messages – individual messages within a conversation
CREATE TABLE IF NOT EXISTS chat_messages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    role            TEXT    NOT NULL CHECK (role IN ('system', 'user', 'assistant')),
    content         TEXT    NOT NULL,
    created_at      TEXT    DEFAULT (datetime('now'))
);

