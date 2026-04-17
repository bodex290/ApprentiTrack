# ApprentiTrack

> IOT552U Business Organisation & Decision Making – A full-stack data platform for tracking apprenticeship KSB (Knowledge, Skills & Behaviours) progress and coverage, with role-based dashboards, rich analytics, and AI-powered insights.

---

## Project Overview

Many apprenticeship programmes rely on platforms like Smart Assessor for administrative tasks but lack robust tools for tracking **KSB competency coverage**. ApprentiTrack provides a relational data system and web dashboard that integrates apprenticeship progress data with structured KSB tracking across three role-based portals, enhanced with **AI-powered analytics and a contextual chatbot**.

| Layer    | Tech Stack                              | Folder       |
| -------- | --------------------------------------- | ------------ |
| Frontend | React 18, TypeScript, Vite, Recharts, Tailwind CSS | `/client` |
| Backend  | Python 3.10+, FastAPI, SQLAlchemy 2.0, Pydantic v2 | `/server` |
| Database | SQLite (WAL mode, foreign keys enabled) | `/server/db` |
| AI / LLM | LiteLLM → Azure OpenAI / OpenAI / Custom proxy    | `/server/services` |
| Testing  | Pytest (backend), Vitest + RTL (frontend), Playwright (E2E) | Various |

**All data in this project is synthetic and created solely for demonstration purposes.**

---

## Architecture

ApprentiTrack is a **three-portal application** with role-based access control and integrated AI:

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend (Vite)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐ │
│  │ Admin Portal  │  │ Coach Portal │  │ Apprentice Portal │ │
│  │ • Users       │  │ • Dashboard  │  │ • My Dashboard    │ │
│  │ • Audit Log   │  │ • Apprentices│  │ • Submit Evidence │ │
│  │ • System Stats│  │ • Submissions│  │ • My Submissions  │ │
│  │               │  │ • KSBs       │  │ • My Portfolio    │ │
│  │               │  │ • Cohorts    │  │ • My Feedback     │ │
│  │               │  │ • Modules    │  │ • My Modules      │ │
│  │               │  │ • Intervent. │  │                   │ │
│  └──────────────┘  └──────────────┘  └───────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐│
│  │          🤖 AI ChatBot (all portals, role-aware)        ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│                  Axios + JWT Auth Layer                      │
├─────────────────────────────────────────────────────────────┤
│               FastAPI Backend (76 endpoints)                │
│  ┌────────┐ ┌──────────┐ ┌───────────┐ ┌────────────────┐  │
│  │  Auth  │ │   CRUD   │ │ Analytics │ │  Audit / Admin │  │
│  │ (JWT)  │ │ Routers  │ │ (13 endpt)│ │                │  │
│  └────────┘ └──────────┘ └───────────┘ └────────────────┘  │
│  ┌──────────────────┐  ┌────────────────────────────────┐   │
│  │  AI Chat (4 endpt)│  │ LLM Service (LiteLLM → Azure) │  │
│  └──────────────────┘  └────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│          SQLAlchemy ORM → SQLite (15 tables, 3NF)           │
└─────────────────────────────────────────────────────────────┘
```

---

## Entity-Relationship Diagram

```
                          ┌───────────┐
                          │   users   │
                          │───────────│
                          │ id (PK)   │
                          │ email (UQ)│
                          │ role (CK) │──────────────────────┐
                          │ apprentice│                      │
                          │   _id (FK)│──┐                   │
                          └──┬──┬─────┘  │                   │
                             │  │        │                   │
              ┌──────────────┘  │        │                   │
              │                 │        │                   ▼
              │                 │        │          ┌──────────────┐
              │                 │        │          │  audit_logs  │
              │                 │        │          │──────────────│
              │                 │        │          │ user_id (FK) │
              │                 │        │          │ action       │
              │                 │        │          │ target_type  │
              │                 │        │          └──────────────┘
              │                 │        │
              │                 ▼        │
              │     ┌─────────────────┐  │
              │     │chat_conversations│  │
              │     │─────────────────│  │
              │     │ id (PK)         │  │
              │     │ user_id (FK)    │  │
              │     │ title           │  │
              │     └───────┬─────────┘  │
              │             │            │
              │             ▼            │
              │     ┌─────────────────┐  │
              │     │ chat_messages   │  │
              │     │─────────────────│  │
              │     │ conversation_id │  │
              │     │   (FK)          │  │
              │     │ role (CK)       │  │
              │     │ content         │  │
              │     └─────────────────┘  │
              │                          │
              ▼                          │
       ┌──────────────┐                  │
       │ coach_cohorts│                  │
       │──────────────│                  │
       │ user_id (FK) │                  │
       │ cohort_id(FK)│                  │
       │ (UQ pair)    │                  │
       └──────┬───────┘                  │
              │                          │
              ▼                          │
       ┌──────────────┐                  │
       │   cohorts    │                  │
       │──────────────│                  │
       │ id (PK)      │◄────────────────│────────┐
       │ name         │                  │        │
       │ programme    │                  │        │
       │ start_date   │                  │        │
       └──────────────┘                  │        │
                                         │        │
       ┌──────────────┐                  │        │
       │ apprentices  │◄─────────────────┘        │
       │──────────────│                           │
       │ id (PK)      │◄──────────────────┐       │
       │ email (UQ)   │                   │       │
       │ cohort_id(FK)│───────────────────┘───────┘
       │ employer     │
       └──────┬───────┘
              │
   ┌──────────┼────────────────┐
   ▼          │                ▼
┌───────────────┐  │    ┌────────────────────┐
│ intervention  │  │    │evidence_submissions│
│   _flags      │  │    │────────────────────│
│───────────────│  │    │ id (PK)            │
│ apprentice_id │  │    │ apprentice_id (FK) │
│ severity (CK) │  │    │ assessment_id (FK) │──┐
│ status (CK)   │  │    │ module_id (FK)     │  │
└───────────────┘  │    │ status (CK)        │  │
                   │    │ submitted_at       │  │
                   │    └────────┬───────────┘  │
                   │             │               │
                   │    ┌────────┼───────┐       │
                   │    ▼        │       ▼       │
                   │ ┌────────┐  │  ┌─────────┐  │
                   │ │submissi│  │  │ coach   │  │
                   │ │on_ksbs │  │  │_feedback│  │
                   │ │────────│  │  │─────────│  │
                   │ │sub_id  │  │  │sub_id   │  │
                   │ │ksb_id  │  │  │rating   │  │
                   │ │UQ pair │  │  │(CK 1-5) │  │
                   │ └───┬────┘  │  └─────────┘  │
                   │     │       │               │
                   │     ▼       │               │
                   │ ┌────────┐  │               │
                   │ │  ksbs  │  │               │
                   │ │────────│  │               │
                   │ │ id(PK) │  │               │
                   │ │code(UQ)│◄─┼─────┐         │
                   │ │type(CK)│  │     │         │
                   │ └────────┘  │     │         │
                   │             │     │         │
            ┌──────────────┐     │  ┌──────────┐ │
            │  module_ksbs │     │  │  modules │ │
            │──────────────│     │  │──────────│ │
            │ module_id(FK)│─────┼─▶│ id (PK)  │ │
            │ ksb_id (FK)  │─────┘  │ code (UQ)│ │
            │ (UQ pair)    │        └────┬─────┘ │
            └──────────────┘             │       │
                                         ▼       │
                                  ┌────────────┐ │
                                  │assessments │ │
                                  │────────────│ │
                                  │ module_id  │ │
                                  │   (FK)     │◄┘
                                  │ due_date   │
                                  └────────────┘
```

### Data Integrity Summary

| Constraint Type     | Count | Examples                                                   |
| ------------------- | ----- | ---------------------------------------------------------- |
| Primary Keys        | 15    | One per entity                                             |
| Foreign Keys        | 17    | `apprentices.cohort_id → cohorts.id`, `chat_messages.conversation_id → chat_conversations.id`, etc. |
| Check Constraints   | 8     | `role IN (admin,coach,apprentice)`, `rating BETWEEN 1-5`, `chat_msg role IN (system,user,assistant)` |
| Unique Constraints  | 6     | `users.email`, `uq_coach_cohort`, `uq_submission_ksb`     |
| Normalisation       | 3NF   | Three junction tables decompose M:N relationships          |

---

## Folder Structure

```
├── client/                       # React + TypeScript + Vite frontend
│   ├── src/
│   │   ├── components/           # 12 shared components (Dashboard, ChatBot, Modal, etc.)
│   │   ├── context/              # AuthContext (JWT state management)
│   │   ├── layouts/              # AdminLayout, CoachLayout, ApprenticeLayout
│   │   ├── pages/
│   │   │   ├── admin/            # UserManagement, AuditLog, AdminDashboard
│   │   │   └── apprentice/       # MyDashboard, SubmitEvidence, MyPortfolio, etc.
│   │   ├── services/             # Axios API client with interceptors
│   │   └── test/                 # 5 Vitest test suites
│   ├── e2e/                      # Playwright E2E tests
│   └── package.json
│
├── server/                       # Python + FastAPI backend
│   ├── db/
│   │   ├── database.py           # SQLAlchemy engine (SQLite, WAL mode)
│   │   └── schema.sql            # Reference DDL (15 tables)
│   ├── models/models.py          # 15 SQLAlchemy ORM models
│   ├── schemas/schemas.py        # Pydantic v2 request/response schemas
│   ├── routers/                  # 15 API routers (76 endpoints)
│   │   ├── auth.py               # JWT login, token, /me, change-password
│   │   ├── analytics.py          # 12 data endpoints (charts, summaries)
│   │   ├── analysis.py           # AI-powered chart analysis (9 chart types, LLM + fallback)
│   │   ├── chat.py               # AI chatbot (send message, conversations CRUD)
│   │   ├── my.py                 # Apprentice self-service portal
│   │   ├── users.py              # Admin user management
│   │   ├── admin.py              # Audit log, system stats
│   │   └── ...                   # apprentices, cohorts, modules, ksbs, submissions,
│   │                             #   interventions, feedback, health
│   ├── services/
│   │   └── llm.py                # LiteLLM wrapper (Azure/OpenAI/custom proxy)
│   ├── seeds/
│   │   ├── seed_full.py          # Comprehensive seed (32 users, 80 submissions)
│   │   ├── seed.sql              # Original SQL seed data
│   │   └── seed_users.py         # User + coach-cohort seeder
│   ├── tests/                    # 3 Pytest test modules (~48 tests)
│   ├── auth.py                   # JWT + bcrypt + role-based middleware
│   ├── audit.py                  # Audit logging utility
│   ├── main.py                   # FastAPI app entry point
│   └── requirements.txt
│
├── .env.example
├── .gitignore
└── README.md
```

---

## Database Schema (15 Entities)

| Table                  | Purpose                                           | Key Constraints        |
| ---------------------- | ------------------------------------------------- | ---------------------- |
| `users`                | Auth accounts (admin / coach / apprentice)        | `role` CHECK, UQ email |
| `coach_cohorts`        | Junction: coach ↔ cohort assignments              | UQ (user_id, cohort_id)|
| `cohorts`              | Programme intake groups                            |                        |
| `apprentices`          | Individual learners                                | UQ email               |
| `modules`              | Units of learning                                  | UQ code                |
| `module_ksbs`          | Junction: module ↔ KSB official mappings          | UQ (module_id, ksb_id) |
| `assessments`          | Assessed work within modules                       | FK → modules           |
| `ksbs`                 | Knowledge, Skills & Behaviours from the standard   | `type` CHECK, UQ code  |
| `evidence_submissions` | Work submitted by apprentices                      | `status` CHECK         |
| `submission_ksbs`      | Junction: submission ↔ KSB competency mappings    | UQ (sub_id, ksb_id)    |
| `coach_feedback`       | Coach comments & ratings on submissions            | `rating` CHECK (1–5)   |
| `intervention_flags`   | Support flags for at-risk apprentices              | `severity`, `status` CHECKs |
| `audit_logs`           | Security and compliance event log                  | FK → users             |
| `chat_conversations`   | AI chatbot conversation sessions per user          | FK → users             |
| `chat_messages`        | Individual messages within conversations           | `role` CHECK (system/user/assistant) |

---

## API Reference (76 Endpoints)

### Authentication (`/api/auth`)

| Method | Endpoint              | Auth   | Description                    |
| ------ | --------------------- | ------ | ------------------------------ |
| POST   | `/login`              | None   | JWT login (returns token)      |
| POST   | `/token`              | None   | OAuth2-compatible token endpoint |
| POST   | `/change-password`    | JWT    | Change current user's password |
| GET    | `/me`                 | JWT    | Current user profile           |

### Apprentice Self-Service (`/api/my`)

| Method | Endpoint        | Auth        | Description                           |
| ------ | --------------- | ----------- | ------------------------------------- |
| GET    | `/dashboard`    | Apprentice  | Personal dashboard metrics            |
| GET    | `/submissions`  | Apprentice  | Own submissions                       |
| POST   | `/submissions`  | Apprentice  | Submit evidence (journal entry)       |
| PUT    | `/submissions/:id` | Apprentice | Update own submission              |
| GET    | `/portfolio`    | Apprentice  | KSB portfolio overview                |
| GET    | `/modules`      | Apprentice  | Available modules + assessments       |
| GET    | `/feedback`     | Apprentice  | Feedback received on submissions      |
| GET    | `/ksbs`         | Apprentice  | All KSBs with coverage status         |

### Admin (`/api/users`, `/api/admin`)

| Method | Endpoint                  | Auth  | Description                     |
| ------ | ------------------------- | ----- | ------------------------------- |
| GET    | `/users`                  | Admin | List all users                  |
| GET    | `/users/:id`              | Admin | Get user by ID                  |
| POST   | `/users/coach`            | Admin | Create coach account            |
| POST   | `/users/apprentice`       | Admin | Create apprentice account       |
| PUT    | `/users/coach/:id`        | Admin | Update coach                    |
| PUT    | `/users/apprentice/:id`   | Admin | Update apprentice user          |
| DELETE | `/users/:id`              | Admin | Delete user                     |
| POST   | `/users/:id/assign-cohorts` | Admin | Assign cohorts to coach       |
| GET    | `/users/:id/cohorts`      | Admin | Get coach's assigned cohorts    |
| GET    | `/admin/audit-log`        | Admin | Paginated audit log             |
| GET    | `/admin/system-stats`     | Admin | System-wide counts              |

### Data Management (Admin + Coach)

| Method | Endpoint                | Auth         | Description               |
| ------ | ----------------------- | ------------ | ------------------------- |
| GET    | `/apprentices`          | Admin/Coach  | List (coach-scoped)       |
| POST   | `/apprentices`          | Admin        | Create apprentice record  |
| PUT    | `/apprentices/:id`      | Admin        | Update                    |
| DELETE | `/apprentices/:id`      | Admin        | Delete                    |
| GET    | `/cohorts`              | Admin/Coach  | List (coach-scoped)       |
| POST   | `/cohorts`              | Admin        | Create                    |
| PUT    | `/cohorts/:id`          | Admin        | Update                    |
| DELETE | `/cohorts/:id`          | Admin        | Delete                    |
| GET    | `/modules`              | Admin/Coach  | List with detail          |
| POST   | `/modules`              | Admin        | Create                    |
| PUT    | `/modules/:id`          | Admin        | Update                    |
| DELETE | `/modules/:id`          | Admin        | Delete                    |
| GET    | `/ksbs`                 | Admin/Coach  | List all KSBs             |
| POST   | `/ksbs`                 | Admin        | Create                    |
| PUT    | `/ksbs/:id`             | Admin        | Update                    |
| DELETE | `/ksbs/:id`             | Admin        | Delete                    |
| GET    | `/submissions`          | Admin/Coach  | List (coach-scoped, paginated) |
| PUT    | `/submissions/:id`      | Coach        | Update status (triggers audit) |
| GET    | `/interventions`        | Admin/Coach  | List                      |
| POST   | `/interventions`        | Admin/Coach  | Raise flag                |
| PATCH  | `/interventions/:id`    | Admin/Coach  | Update (start/resolve)    |
| DELETE | `/interventions/:id`    | Admin        | Delete                    |
| GET    | `/feedback`             | Admin/Coach  | List feedback             |
| POST   | `/feedback`             | Admin/Coach  | Create (with audit)       |
| PUT    | `/feedback/:id`         | Admin/Coach  | Update (with audit)       |
| DELETE | `/feedback/:id`         | Admin/Coach  | Delete (with audit)       |

### Analytics (`/api/analytics`) — 11 Endpoints

| Endpoint               | Chart Type            | Insight                                    |
| ---------------------- | --------------------- | ------------------------------------------ |
| `/summary`             | Metric cards          | Apprentices, submissions, KSB %, interventions, avg rating |
| `/submissions-by-status` | —                   | Submission counts by status                |
| `/submissions-by-module` | Horizontal bar      | Submissions per module                     |
| `/ksb-coverage`        | —                     | Per-KSB evidence counts + coverage %       |
| `/ksb-coverage-by-type` | Donut               | Coverage by Knowledge / Skill / Behaviour  |
| `/apprentice-progress` | Grouped bar           | Per-apprentice KSB coverage %              |
| `/feedback`            | —                     | All feedback with submission details       |
| `/submission-trends`   | Stacked area          | Monthly submissions by status over time    |
| `/cohort-comparison`   | Grouped bar           | Cross-cohort submissions, accepted, interventions |
| `/ksb-heatmap`         | Heatmap table         | KSB × Module evidence density grid         |
| `/apprentice-scatter`  | Scatter               | Submissions vs KSB coverage per apprentice |
| `/intervention-analysis` | Stacked bar + Line  | Severity × status matrix + monthly trend   |

All analytics endpoints are **coach-scoped** — coaches see only their assigned cohorts.

### AI-Powered Chart Analysis (`/api/analytics/{chart_id}/analysis`)

| Method | Endpoint                    | Auth         | Description                         |
| ------ | --------------------------- | ------------ | ----------------------------------- |
| GET    | `/{chart_id}/analysis`      | Admin/Coach  | AI-generated insights for a chart   |

**Valid chart IDs:** `trends`, `ksbType`, `modules`, `cohorts`, `scatter`, `severity`, `monthlyInt`, `progress`, `heatmap`

- Sends chart data to the LLM with a domain-specific system prompt
- Returns structured JSON: `summary`, `insights[]` (label, value, color), `recommendations[]`
- 15-minute per-user cache to reduce API calls
- Complete rule-based fallback if the LLM is unavailable

### AI Chatbot (`/api/chat`)

| Method | Endpoint                          | Auth  | Description                          |
| ------ | --------------------------------- | ----- | ------------------------------------ |
| POST   | `/`                               | Any   | Send a message, get AI response      |
| GET    | `/conversations`                  | Any   | List user's conversations            |
| GET    | `/conversations/{id}`             | Any   | Get full conversation with messages  |
| DELETE | `/conversations/{id}`             | Any   | Delete a conversation                |

- **Role-aware context**: gathers different data depending on user role (admin/coach/apprentice)
- **Rich data injection**: per-coach workloads, per-apprentice KSB coverage, intervention details, submission history
- **Persistent conversations**: stored in `chat_conversations` / `chat_messages` tables
- **Conversation history**: last 20 messages sent to LLM for context continuity

---

## Dashboard Visualisations (9 Charts, 8 Types)

1. **Stacked Area** — Submission Trends Over Time (monthly, by status)
2. **Donut** — KSB Coverage by Type (Knowledge / Skill / Behaviour)
3. **Horizontal Bar** — Submissions by Module
4. **Grouped Bar** — Cohort Comparison (submissions, accepted, interventions)
5. **Scatter** — Apprentice Performance (submissions × KSB coverage, bubble = accepted)
6. **Stacked Horizontal Bar** — Interventions by Severity (open/in-progress/resolved)
7. **Line** — Intervention Monthly Trend (by severity)
8. **Grouped Bar** — Apprentice KSB Coverage (%)
9. **Heatmap Table** — KSB Evidence by Module (colour-coded density)

---

## AI Features

ApprentiTrack integrates a Large Language Model (LLM) for two features: **chart analysis** and an **interactive chatbot**.

### LLM Integration (`services/llm.py`)

| Feature              | Detail                                                      |
| -------------------- | ----------------------------------------------------------- |
| Provider abstraction | LiteLLM wraps Azure OpenAI, OpenAI, or any compatible proxy |
| Model                | Configurable via `LLM_MODEL` env var (default: `openai/azure.gpt-4o-mini`) |
| SSL handling         | Supports `SSL_VERIFY=false` for corporate proxies           |
| Fallback             | All AI features degrade gracefully if the LLM is unavailable |
| Functions            | `get_completion()`, `get_chat_completion()`, `get_json_completion()` |

### Chart Analysis (`routers/analysis.py`)

Each dashboard chart has an "Analyse" button that calls `/api/analytics/{chart_id}/analysis`. The server:

1. Fetches the chart's raw data from the database
2. Builds a domain-specific prompt with the data as JSON
3. Sends it to the LLM requesting structured JSON output (summary, insights, recommendations)
4. Caches the result for 15 minutes per user
5. Falls back to rule-based analysis if the LLM is unreachable

### AI Chatbot (`routers/chat.py` + `components/ChatBot.tsx`)

A floating chatbot widget available in all three portals (admin, coach, apprentice):

- **Role-specific system prompt**: tailored instructions for each user type
- **Deep data context**: the system prompt is injected with comprehensive, role-scoped data:
  - **Admin**: system-wide overview, per-cohort breakdowns, per-coach workload tables, open intervention details
  - **Coach**: per-cohort summary, per-apprentice KSB coverage %, missing KSBs, intervention severity, feedback ratings
  - **Apprentice**: personal submission history with KSBs and ratings, missing KSB list with descriptions, feedback comments
- **Role-specific suggested prompts**: pre-loaded question chips based on user role
- **Persistent conversations**: full history stored in the database, accessible across sessions
- **Markdown rendering**: tables, headings, bold, bullet points, numbered lists rendered in the chat UI

---

## Authentication & Security

| Feature                  | Implementation                                     |
| ------------------------ | -------------------------------------------------- |
| Password hashing         | bcrypt (direct, not passlib)                       |
| JWT tokens               | python-jose, HS256, 8h expiry (configurable)       |
| Role-based access        | `require_role()` factory → FastAPI `Depends`       |
| Forced password change   | `must_change_password` flag, frontend redirect     |
| Audit logging            | AuditLog model: login, CRUD, status changes, IP    |
| 401 auto-logout          | Axios interceptor clears token on 401              |
| Anti-caching             | Middleware adds `Cache-Control: no-cache` to `/api/` |

---

## Testing

### Backend (Pytest) — ~48 tests

| Module                  | Coverage                                          |
| ----------------------- | ------------------------------------------------- |
| `test_auth.py`          | Login (success/fail/inactive), /me, change-password, role guards |
| `test_crud.py`          | Full CRUD for apprentices, cohorts, modules, KSBs, submissions, interventions, users, analytics |
| `test_apprentice_portal.py` | Dashboard, evidence submission, portfolio, feedback, modules, KSBs |

### Frontend (Vitest + React Testing Library) — ~30 tests

| Module                  | Coverage                                          |
| ----------------------- | ------------------------------------------------- |
| `api.test.ts`           | Request/response interceptors, token injection, 401 handling |
| `api-exports.test.ts`   | All API functions exported with correct HTTP methods |
| `auth-context.test.tsx` | AuthProvider state, login, logout, forced logout   |
| `login-page.test.tsx`   | Login page rendering                               |
| `routing.test.tsx`      | Route protection, role-based redirects, must_change_password |

### E2E (Playwright)

| Test                    | Coverage                                          |
| ----------------------- | ------------------------------------------------- |
| `app.spec.ts`           | Login flow, dashboard loads with charts, coach submission view + status change, admin user creation |

---

## Seed Data

The `seed_full.py` script creates a rich demo dataset:

| Entity              | Count | Details                                        |
| ------------------- | ----- | ---------------------------------------------- |
| Cohorts             | 5     | Sept 2024 → Jan 2026                           |
| Apprentices         | 25    | 5 per cohort, diverse employers                |
| Users               | 32    | 1 admin + 6 coaches + 25 apprentice users      |
| Modules             | 6     | IOT552U–IOT557U                                |
| Assessments         | 8     | Spread across modules                          |
| KSBs                | 13    | 5 Knowledge + 5 Skill + 3 Behaviour            |
| Submissions         | ~80   | Explicit dates Oct 2024 → Mar 2026             |
| Submission-KSB links| ~160  | 1–3 KSBs per submission                        |
| Coach feedback      | ~47   | Ratings weighted 3–5, linked to coaches        |
| Intervention flags  | ~32   | Various severities, spread across cohorts      |

**Login Credentials (demo):**

| Role        | Email                   | Password        |
| ----------- | ----------------------- | --------------- |
| Admin       | `admin@system.com`      | `Admin123!`     |
| Lead Coach  | `lead.coach@uni.ac.uk`  | `Coach123!`     |
| Coach       | `dr.patel@uni.ac.uk`    | `Coach123!`     |
| Apprentice  | `alex.morgan@example.com` | `Apprentice123!` |

---

## Getting Started

### Prerequisites

- **Node.js** >= 18
- **Python** >= 3.10
- SQLite is included with Python — no separate database install required.

### 1. Clone the repository

```bash
git clone <repo-url>
cd iot552u-data-solution-project
```

### 2. Configure environment variables

```bash
cp .env.example .env
# Edit .env with your LLM provider credentials (see .env.example for options)
# The app works without LLM keys — AI features fall back to rule-based analysis
```

**LLM Provider Options** (set in `server/.env`):

| Provider       | Required Variables                          |
| -------------- | ------------------------------------------- |
| Azure Proxy    | `AZURE_API_KEY`, `AZURE_BASE_URL`           |
| OpenAI Direct  | `OPENAI_API_KEY`                            |
| Custom Proxy   | `LITELLM_API_KEY`, `LLM_API_BASE`          |

Common settings: `LLM_MODEL` (default: `openai/azure.gpt-4o-mini`), `SSL_VERIFY` (default: `true`).

### 3. Start the backend

```bash
cd server
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

The API will be at `http://localhost:8001`.  
Swagger docs: `http://localhost:8001/docs`

### 4. Seed the database

```bash
cd server
python seeds/seed_full.py
```

### 5. Start the frontend

```bash
cd client
npm install
npm run dev
```

The app will be at `http://localhost:5173`.

### 6. Run tests

```bash
# Backend
cd server
python -m pytest tests/ -v

# Frontend unit tests
cd client
npm test

# E2E tests (requires both servers running)
cd client
npx playwright test
```

---

## Deployment

| Component | Recommended Platforms          |
| --------- | ----------------------------- |
| Frontend  | Vercel                        |
| Backend   | Railway, Render, or Fly.io    |
| Database  | Hosted SQLite (e.g. Turso)    |

Set `VITE_API_URL` in the Vercel project settings to point to the deployed backend URL.

---

## License

This project is for educational purposes as part of the IOT552U module.
