# System Architecture & Design Specification (Phase 1)

## 1. System Overview
The Applicant Tracking System (ATS) is a multi-tenant web application designed to connect Candidates and Recruiters. The platform allows recruiters to publish job postings, review incoming candidate applications, transition applications through a controlled hiring pipeline, and export candidate data. Candidates can discover active job openings, filter by keywords/status, apply with PDF resumes, and track their application pipeline status.

The system is built on a modern decoupled web architecture:
- **Backend**: Node.js REST API with TypeScript, adhering to a layered architecture (`routes -> controllers -> services -> models`).
- **Frontend**: Single Page Application (SPA) built with React and TypeScript.
- **Database & Auth & Storage**: Supabase (PostgreSQL with Row Level Security, Supabase Auth for JWT user management, and Supabase Storage for private resume PDF storage).

---

## 2. Roles and Responsibilities

### 2.1 Recruiter
- **Authentication**: Sign up and sign in via Supabase Auth with a `recruiter` role profile.
- **Job Management**: Create new job postings and view only their own posted jobs.
- **Application Pipeline**: View applications submitted specifically for their posted jobs.
- **Stage Progression**: Update single application stages or perform bulk stage updates (with concurrency limits and optimistic locking).
- **Data Export**: Stream and download applications as CSV files (optimized for large datasets of 10,000+ rows).

### 2.2 Candidate
- **Authentication**: Sign up and sign in via Supabase Auth with a `candidate` role profile.
- **Job Discovery**: Browse active job postings, perform debounced text searches by job title, and filter jobs by status.
- **Application Submission**: View detailed job specifications and apply by submitting a PDF resume.
- **Application Management**: View their own submitted applications and active pipeline stages. Cannot apply to the same job twice.

---

## 3. Database Entities

### 3.1 `profiles`
Stores application-specific user metadata tied directly to Supabase Auth users.
- `id` (`UUID`, Primary Key): References `auth.users.id` (1:1 link with authenticated identity).
- `email` (`VARCHAR(255)`, NOT NULL): User email address.
- `full_name` (`VARCHAR(255)`, NULLABLE): User display name.
- `role` (`VARCHAR(50)`, NOT NULL): Role identifier (`'recruiter'` | `'candidate'`).
- `created_at` (`TIMESTAMPTZ`, DEFAULT `NOW()`): Record creation timestamp.
- `updated_at` (`TIMESTAMPTZ`, DEFAULT `NOW()`): Record last update timestamp.

### 3.2 `jobs`
Stores job postings created by recruiters.
- `id` (`UUID`, Primary Key, DEFAULT `gen_random_uuid()`): Unique job identifier.
- `recruiter_id` (`UUID`, NOT NULL): Foreign key referencing `profiles.id`.
- `title` (`VARCHAR(255)`, NOT NULL): Job title.
- `description` (`TEXT`, NOT NULL): Full job description and requirements.
- `location` (`VARCHAR(255)`, NOT NULL): Work location (e.g. Remote, On-site).
- `type` (`VARCHAR(50)`, NOT NULL): Employment type (`'full-time'` | `'part-time'` | `'contract'`).
- `status` (`VARCHAR(50)`, NOT NULL, DEFAULT `'published'`): Status (`'draft'` | `'published'` | `'archived'`).
- `created_at` (`TIMESTAMPTZ`, DEFAULT `NOW()`): Creation timestamp.
- `updated_at` (`TIMESTAMPTZ`, DEFAULT `NOW()`): Last modified timestamp.

### 3.3 `applications`
Stores candidate job applications and stage progress.
- `id` (`UUID`, Primary Key, DEFAULT `gen_random_uuid()`): Unique application identifier.
- `job_id` (`UUID`, NOT NULL): Foreign key referencing `jobs.id`.
- `candidate_id` (`UUID`, NOT NULL): Foreign key referencing `profiles.id`.
- `stage` (`VARCHAR(50)`, NOT NULL, DEFAULT `'applied'`): Current pipeline stage (`'applied'` | `'screening'` | `'interview'` | `'offer'` | `'rejected'`).
- `resume_url` (`TEXT`, NOT NULL): Path to candidate's stored PDF resume in Supabase Storage.
- `version` (`INTEGER`, NOT NULL, DEFAULT `1`): Version counter used for **optimistic concurrency locking**.
- `created_at` (`TIMESTAMPTZ`, DEFAULT `NOW()`): Application submission timestamp.
- `updated_at` (`TIMESTAMPTZ`, DEFAULT `NOW()`): Last stage modification timestamp.

---

## 4. Entity Relationships

```
+------------------+         1 : N         +------------------+
|     profiles     |---------------------->|       jobs       |
| (Recruiter/Cand) |                       |  (Job Postings)  |
+------------------+                       +------------------+
         |                                           |
         | 1 : N                                     | 1 : N
         v                                           v
+-------------------------------------------------------------+
|                        applications                         |
|             (Candidate Application & Versioning)            |
+-------------------------------------------------------------+
```

1. **`profiles` -> `jobs` (1 : N)**: A recruiter profile can post multiple jobs. Each job belongs to exactly one recruiter profile.
2. **`profiles` -> `applications` (1 : N)**: A candidate profile can apply to multiple jobs. Each application belongs to exactly one candidate profile.
3. **`jobs` -> `applications` (1 : N)**: A job posting can receive multiple candidate applications. Each application is submitted for exactly one job posting.

---

## 5. Important Constraints & Business Rules

### 5.1 Duplicate Application Prevention
- A candidate MUST NOT be able to apply to the same job more than once.
- **Database Constraint**: `UNIQUE (job_id, candidate_id)` on the `applications` table.
- **Application Logic**: The service layer checks for existing applications before upload to provide clean user feedback (409 Conflict).

### 5.2 Application Stage Transition Rules
Applications transition through 5 strictly controlled pipeline stages:
1. `applied` (Initial state)
2. `screening`
3. `interview`
4. `offer`
5. `rejected` (Terminal state)

#### Allowed State Machine Graph:
```
           +------------> screening ------------> interview ------------> offer
           |                  |                       |                     |
           |                  v                       v                     v
  [ applied ] ------------> rejected <----------------+---------------------+
```

#### Transition Matrix & Rules:
- Valid forward moves: `applied -> screening`, `screening -> interview`, `interview -> offer`.
- Direct rejection moves: `applied -> rejected`, `screening -> rejected`, `interview -> rejected`, `offer -> rejected`.
- **Forbidden Transitions**:
  - Direct skip transitions (e.g. `applied -> offer`, `applied -> interview`).
  - Terminal state mutation: Once an application enters `rejected`, no further stage modifications are permitted under any circumstance (`rejected -> ANY` is illegal).
- **Validation**: Enforced on the server side in the `ApplicationService` state transition validator before DB update operations.

---

## 6. Authorization Approach

Security follows a **defense-in-depth** model enforced at both the API Server layer and the PostgreSQL database level (Supabase Row Level Security - RLS).

### 6.1 Server-Side Middleware
- **JWT Verification**: Auth middleware verifies the Supabase Bearer token on incoming requests and attaches user context (`auth.uid()`, `role`) to `req.user`.
- **Role Guards**: Middleware restricts recruiter endpoints (e.g., POST `/jobs`, PATCH `/applications/:id/stage`) to users with `role = 'recruiter'`.

### 6.2 PostgreSQL Row Level Security (RLS) Policies
- **`jobs` Table**:
  - `SELECT`: Public access for published jobs (`status = 'published'`). Recruiters can SELECT all their own jobs regardless of status (`recruiter_id = auth.uid()`).
  - `INSERT` / `UPDATE` / `DELETE`: Restricted to recruiters where `recruiter_id = auth.uid()`.
- **`applications` Table**:
  - `SELECT`: Candidates can SELECT only their own applications (`candidate_id = auth.uid()`). Recruiters can SELECT applications for jobs they own (`job_id IN (SELECT id FROM jobs WHERE recruiter_id = auth.uid())`).
  - `INSERT`: Restricted to candidates (`candidate_id = auth.uid()`).
  - `UPDATE`: Restricted to recruiters who own the corresponding job.
- **`profiles` Table**:
  - `SELECT` / `UPDATE`: Authenticated users can access only their own profile (`id = auth.uid()`).

---

## 7. Planned Database Indexes

1. **`idx_applications_job_id`** on `applications (job_id)`
   - *Rationale*: Recruiters frequently fetch all applications for a specific job posting (`WHERE job_id = ?`).
2. **`idx_applications_candidate_id`** on `applications (candidate_id)`
   - *Rationale*: Candidates query their application history dashboard (`WHERE candidate_id = ?`).
3. **`idx_applications_job_candidate_uniq`** (UNIQUE INDEX) on `applications (job_id, candidate_id)`
   - *Rationale*: Enforces duplicate application constraint at DB level and provides O(1) lookup during submission checks.
4. **`idx_jobs_recruiter_id`** on `jobs (recruiter_id)`
   - *Rationale*: Enables fast lookup when recruiters load their job dashboard.
5. **`idx_jobs_status_title`** on `jobs (status, title)`
   - *Rationale*: Optimizes candidate job search filtering by published status and title sorting/searching.

---

## 8. Async Requirements Mapping to Features

| Requirement | Async Pattern | Feature Integration |
|---|---|---|
| **3.1 Callback -> Promise** | Promisified callback wrapper | Converting legacy Node.js filesystem/stream upload callbacks to Async/Await Promises during candidate PDF resume storage uploads. |
| **3.2 Concurrency Limiter** | Hand-written queue/semaphore (Max 5) | Throttling bulk stage updates when recruiters move multiple candidates across stages to prevent connection pool exhaustion. |
| **3.3 Event Loop / CSV** | Node.js Readable/Transform Streams | Streaming bulk application data directly to the HTTP response pipe for 10k+ rows without blocking the main event loop. |
| **3.4 Fire-and-Forget Email** | Non-blocking background worker | Triggering candidate application confirmation and recruiter alert emails asynchronously without delaying the HTTP 201 response. |
| **3.5 Race Condition** | Optimistic Concurrency Locking | Using `applications.version` to detect and reject stale concurrent updates when two recruiters edit the same application stage simultaneously. |
| **3.6 Closures / Debounce** | Hand-written closures-based debounce | Debouncing user keystrokes (300ms) on candidate job search inputs to minimize backend search API load. |

---

## 9. High-Level API Structure

The backend follows a strict layered architecture pattern (`routes -> controllers -> services -> models`):

```
Client Request
      │
      v
 [ Middleware ]  <-- Auth JWT verification, Role check, Input Validation
      │
      v
 [ Routes ]      <-- Endpoint path definition & handler mapping
      │
      v
 [ Controllers ] <-- HTTP request parsing, response formatting, status codes
      │
      v
 [ Services ]    <-- Business logic, stage state machine, optimistic locking, async tasks
      │
      v
 [ Database ]    <-- Supabase client / PostgreSQL queries & RLS
```

### Planned Endpoint Overview
- `POST /api/auth/signup` & `POST /api/auth/login` (Authentication)
- `GET /api/jobs` (Candidate job search & filter)
- `POST /api/jobs` (Recruiter job creation)
- `GET /api/jobs/:id` (Job details view)
- `POST /api/applications` (Candidate application submission with PDF upload)
- `GET /api/applications/candidate` (Candidate application listing)
- `GET /api/applications/job/:jobId` (Recruiter application listing for job)
- `PATCH /api/applications/:id/stage` (Single application stage update with optimistic locking)
- `POST /api/applications/bulk-stage` (Bulk application stage update with concurrency limiter)
- `GET /api/applications/export-csv` (Streaming CSV export for 10k+ rows)

---

## 10. Scaling Considerations
1. **Streaming Data Transfers**: Exporting 10,000+ application records as a single JSON array can cause memory OOM errors and event loop lag. Using Node.js streams and CSV formatting on the fly reduces memory footprint to O(1).
2. **Database Connection Pooling**: Supabase PgBouncer / Supavisor connection pooling is leveraged to handle spike traffic during peak application submission hours.
3. **Database Index Coverage**: Compound indexes on status/title and job/candidate relationships ensure query execution plans rely on index scans instead of sequential table scans.

---

## 11. Email Queue Design
- **Problem**: Synchronously waiting for third-party SMTP or transactional email API calls (e.g. SendGrid/Resend) adds 200ms–1500ms latency to application submission response times.
- **Architecture**: A decoupled fire-and-forget worker pattern.
  - Upon successful application insertion, `ApplicationService` enqueues an email task payload into an in-memory queue/event emitter.
  - The HTTP request handler immediately returns HTTP 201 Created to the candidate.
  - A background process consumes tasks from the queue and handles retries without affecting client requests.

---

## 12. Time-Pressure Tradeoffs
1. **PostgreSQL RLS over Custom Microservice Authorization**: Leveraging native PostgreSQL RLS policies provides bank-grade authorization with zero custom auth service overhead.
2. **Optimistic Locking over Heavy DB Row Locks (`SELECT FOR UPDATE`)**: Optimistic locking via `applications.version` eliminates row lock contention and deadlocks while cleanly handling rare concurrent edit collisions.
3. **In-Memory Concurrency Control over External Queue Cluster**: Custom lightweight JavaScript concurrency limiters fulfill async requirements without introducing complex Redis/RabbitMQ dependencies for Phase 1/2.
