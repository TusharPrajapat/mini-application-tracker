# Applicant Tracking System

A full-stack Applicant Tracking System built with:

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **ORM & Database**: Sequelize + PostgreSQL / Supabase
- **Authentication**: Supabase Authentication
- **Security**: Row Level Security (RLS)

---

## 🚀 Current Features

### 🔐 Authentication
- Recruiter signup (`UserRole.RECRUITER = 1`)
- Candidate signup (`UserRole.CANDIDATE = 2`)
- Login authentication via Supabase Auth
- Access token management with `Authorization: Bearer <accessToken>`
- Role-based authorization middleware (`requireRole`)

### 💼 Recruiter Module
- Create job postings (`title`, `description`, `status`: DRAFT / OPEN / CLOSED)
- View posted jobs (filtered by recruiter ownership)
- Update job details and status
- Delete job postings (with deletion confirmation)
- View candidate applications received for posted jobs
- Update candidate application stages (`APPLIED`, `SCREENING`, `INTERVIEW`, `OFFER`, `REJECTED`)

### 📄 Candidate Module
- Browse available open jobs (`JobStatus.OPEN = 2`)
- View full job specifications
- Apply for jobs (with confirmation modal)
- View submitted applications with real-time stage badges

### 🛡️ Security & Integrity
- **Authentication Middleware**: `authenticateToken` verifies Supabase access tokens on protected routes
- **Role-Based Authorization**: `requireRole` protects recruiter and candidate endpoints
- **PostgreSQL Row Level Security (RLS)**: Enforced via `auth.uid()` and `SECURITY DEFINER` helper functions (`current_profile_id()`, `current_profile_role()`)
- **Server-Controlled Ownership**: `candidate_id` and `recruiter_id` are derived strictly from authenticated token context (`req.user.userId`)
- **Duplicate Application Protection**: Database-level `UNIQUE(job_id, candidate_id)` constraint caught as HTTP 409 Conflict
- **Optimistic Concurrency Control**: Application stage updates require matching `version` numbers (`WHERE id = :id AND version = :expectedVersion`) to prevent race conditions

---

## 📁 Repository Structure

```
applicant-tracker/
├── backend/                  # Express + TypeScript API Server
│   ├── src/
│   │   ├── config/          # Database (Sequelize) & Supabase client config
│   │   ├── controllers/     # HTTP Request/Response handlers
│   │   ├── interfaces/      # Service DTOs & response interfaces
│   │   ├── middleware/      # authenticateToken & requireRole middleware
│   │   ├── models/          # Sequelize entities (Profile, Job, Application)
│   │   ├── routes/          # API routes (/api/auth, /api/jobs, /api/applications)
│   │   ├── services/        # Business logic layer
│   │   └── types/           # Enums (UserRole, JobStatus, ApplicationStage)
│
├── frontend/                 # React + TypeScript + Vite SPA
│   ├── src/
│   │   ├── components/      # UI components & modals (JobList, CandidateJobList, ApplicationList, etc.)
│   │   ├── context/         # AuthContext state provider
│   │   ├── pages/           # SignupPage, LoginPage, RecruiterDashboard, CandidateDashboard
│   │   ├── services/        # Centralized fetch API client & service integration
│   │   ├── types/           # Shared TypeScript interfaces & enums
│   │   └── utils/           # Token storage helpers
│
└── supabase/
    └── migrations/          # SQL migrations (001-005: profiles, jobs, applications, RLS policies)
```

---

## 🛠️ Local Development & Setup

### Prerequisites
- Node.js (v18+)
- npm / npx

### 1. Install Dependencies
```bash
# Backend / Root dependencies
npm install

# Frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Configure Environment Variables
Create `backend/.env`:
```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/postgres
SUPABASE_URL=https://<your-supabase-project>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<your-supabase-publishable-key>
```

Create `frontend/.env`:
```env
VITE_API_BASE_URL=http://localhost:3000
```

### 3. Start Development Servers
Run the Express backend (Port 3000):
```bash
cd backend
npm run dev
```

Run the React frontend (Port 5173):
```bash
cd frontend
npm run dev
```

Open your browser at: **[http://localhost:5173](http://localhost:5173)**

---

##  🌱 Database Seeding

### Normal Seed Script (Local Development & Demo)
Populates the database with a realistic demo dataset containing approximately **10 jobs**, **20 candidate profiles**, and **50 candidate applications** distributed across all application stages:
```bash
npm run seed
```

**Default Credentials for Seeded Accounts**:
- **Password for All Accounts**: **`password123`**
- **Recruiter Accounts**:
  - `demo_recruiter_1@example.com` / `password123`
  - `demo_recruiter_2@example.com` / `password123`
- **Candidate Accounts**:
  - `demo_candidate_1@example.com` through `demo_candidate_20@example.com` / `password123`

### Benchmark Seed Script (Part 3.3 High-Volume Performance Benchmark)
Populates the database with **10,000+ candidate application records** specifically used for testing server-side streaming CSV export and TCP backpressure:
```bash
npm run seedBenchmarkData
# or
npm run seed:benchmark
```

**Benchmark Recruiter Credentials**:
- **Email**: `benchmark_recruiter@example.com`
- **Password**: `password123`


