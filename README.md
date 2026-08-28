# Applicant Tracker (ATS) - Phase 1

An end-to-end Applicant Tracking System (ATS) connecting **Recruiters** and **Candidates**.

## 🛠️ Tech Stack
- **Backend**: Node.js, Express, TypeScript
- **Frontend**: React, TypeScript
- **Database & Auth & Storage**: Supabase (PostgreSQL with Row Level Security, Supabase Auth, Supabase Storage)

---

## 📁 Repository Structure

```
applicant-tracker/
│
├── backend/                  # Node.js + TypeScript REST API architecture
│   ├── src/
│   │   ├── config/          # Environment & Supabase client configuration
│   │   ├── models/          # Database entity schemas & interfaces
│   │   ├── routes/          # API route definitions
│   │   ├── controllers/     # HTTP request/response handlers
│   │   ├── services/        # Core business logic & stage state machine
│   │   ├── validators/      # Input validation & transition rules
│   │   ├── middleware/      # Auth JWT & role-based access control
│   │   ├── utils/           # Promisify, debounce, concurrency utilities
│   │   └── types/           # TypeScript interface & type definitions
│   │
│   └── tests/               # Backend unit & integration test suites
│
├── frontend/                 # React + TypeScript SPA frontend
│   └── src/
│       ├── components/      # Reusable UI components
│       ├── pages/           # Page views (Job Search, Dashboards, Applications)
│       ├── hooks/           # Custom React hooks (e.g. debounced search)
│       ├── services/        # API service integration layer
│       ├── types/           # Shared TypeScript interfaces
│       └── utils/           # Helper utilities
│
├── supabase/
│   └── migrations/          # SQL migrations (RLS, schema, indexes, constraints)
│
├── scripts/                 # Maintenance & data seeding scripts
│
├── DESIGN.md                # System design & architecture specification
├── ASYNC.md                 # Documentation for 6 mandatory async patterns
├── README.md                # Project overview and workspace guide
├── .env.example             # Environment variable template
└── .gitignore               # Git ignore pattern rules
```

---

## 📄 Key Documentation

- **[DESIGN.md](file:///c:/Users/91969/Documents/Engineering/Mini%20Application%20Tracker/applicant-tracker/DESIGN.md)**: System architecture overview, roles, database entity design (`profiles`, `jobs`, `applications` with `version`), relationships, unique constraints, application stage state machine, RLS authorization strategy, indexes, streaming CSV exports, and email queue design.
- **[ASYNC.md](file:///c:/Users/91969/Documents/Engineering/Mini%20Application%20Tracker/applicant-tracker/ASYNC.md)**: Design, implementation plan, application mapping, and testing strategies for all six asynchronous requirements:
  1. `3.1 Callback → Promise` (Resume Upload)
  2. `3.2 Concurrency Limiter` (Bulk Stage Updates max 5)
  3. `3.3 Event Loop / CSV` (Streaming Export 10k+ rows)
  4. `3.4 Fire-and-Forget Email` (Background Notification)
  5. `3.5 Race Condition` (Optimistic Locking via `applications.version`)
  6. `3.6 Closures / Debounce` (Job Search Input)

---

## 📌 Phase Status

- **Phase 1 (Complete)**: Architecture skeleton, folder structure, and design specifications established. No database migrations, backend business logic, or frontend UI implemented yet.
- **Phase 2 (Pending)**: Database migration SQL scripts, Supabase RLS policies, backend implementation, frontend implementation, and async requirement integrations.
