# System Architecture & Design Specification

## 1. Executive Summary & System Overview

The Applicant Tracking System (ATS) is a multi-tenant web application designed to connect Candidates and Recruiters through a structured hiring pipeline.

### Core Application Purpose
- **Recruiters** create and manage job postings, review candidate submissions, transition applications through a hiring pipeline, execute bulk stage updates under concurrency limits, and stream bulk application exports.
- **Candidates** discover open job postings, perform debounced text searches, upload PDF resumes, submit applications, and track application status.

### Technical Stack & Decoupled Architecture
- **Frontend**: Single Page Application (SPA) built with React and TypeScript.
- **Backend**: Node.js REST API with Express and TypeScript adhering to a layered architecture (`routes -> controllers -> services -> models`).
- **Database & Persistence**: PostgreSQL via Supabase, managed through the Sequelize ORM.
- **Authentication**: Supabase Auth issuing JWT Bearer tokens.
- **File Storage**: Supabase Storage private bucket (`resumes`).

### Security & Authorization Model
Authentication follows a defense-in-depth model:
- **Authentication Middleware**: Verifies Supabase JWT Bearer tokens on incoming HTTP requests and attaches user identity (`req.user.userId`, `req.user.role`) to Express request context.
- **Role Guards**: Restricts endpoint access by role (e.g. `requireRole(UserRole.RECRUITER)` for job creation and stage updates).
- **Resource Ownership Verification**: Server-side service logic verifies that recruiters can only view/update applications for jobs they own (`job.recruiter_id === recruiterId`).
- **Row Level Security (RLS)**: PostgreSQL tables in Supabase enable RLS policies as a database-level safety mechanism.

---

## 2. Roles, Responsibilities & Pipeline Workflow

### Candidate Capabilities
- **Authentication**: Sign up and sign in via Supabase Auth to receive a JWT.
- **Profile & Resume**: Create candidate profile details and upload a PDF resume (max 5 MB).
- **Job Discovery & Search**: Browse open job postings with debounced text search and filters.
- **Application Submission**: Submit applications for open jobs (strictly one application per candidate per job).
- **Status & Timeline Tracking**: View submitted applications and track pipeline progress.

### Recruiter Capabilities
- **Authentication**: Sign up and sign in with a recruiter profile role.
- **Job Posting Management**: Create, view, update, and close job postings.
- **Application Management**: View candidate applications submitted specifically for their posted jobs.
- **Filter, Search & Sort**: Filter applications by job, stage, and candidate name/email, with page sorting.
- **Pipeline Stage Progression**: Update single application stages with Optimistic Concurrency Control (OCC).
- **Bulk Stage Progression**: Batch update up to 50 application stages with a manual concurrency limiter (max 5 in-flight).
- **Data Export**: Stream large application datasets directly to CSV response stream.
- **Resume Access**: Access candidate profiles and generate short-lived signed URLs for resume downloads.

### Application Pipeline Workflow & State Machine Graph

```
Candidate Submits Application
             │
             v
       [ 1: Applied ] (Initial State)
             │
      ┌──────┴──────┐
      │             │
      v             v
[ 2: Screening ] [ 5: Rejected ] (Terminal State)
      │             ▲
      v             │
[ 3: Interview ] ───┤
      │             │
      v             │
  [ 4: Offer ] ─────┘
```

#### Exact Pipeline Stage Enum Values (`ApplicationStage`):
1. **`1: Applied`** (Initial default stage)
2. **`2: Screening`**
3. **`3: Interview`**
4. **`4: Offer`**
5. **`5: Rejected`** (Terminal state)

---

## 3. Database Schema, Data Types & Constraints

### 3.1 Actual PostgreSQL Database Tables

#### Table: `profiles`
Stores user profile records linked to Supabase Auth UUIDs.
- `id` (`BIGSERIAL PRIMARY KEY`): Auto-incrementing internal primary key.
- `auth_user_id` (`UUID NOT NULL UNIQUE`): Foreign link to Supabase `auth.users.id`.
- `email` (`TEXT NOT NULL`): User email address.
- `role` (`SMALLINT NOT NULL`): Role identifier (`1 = RECRUITER`, `2 = CANDIDATE`).
- `created_at`, `updated_at` (`TIMESTAMPTZ NOT NULL DEFAULT NOW()`): Audit timestamps.

#### Table: `jobs`
Stores job postings created by recruiters.
- `id` (`BIGSERIAL PRIMARY KEY`): Auto-incrementing internal primary key.
- `recruiter_id` (`BIGINT NOT NULL`): Foreign key matching `profiles.id` (enforced at Sequelize application layer).
- `title` (`TEXT NOT NULL`): Job title.
- `description` (`TEXT NOT NULL`): Job description.
- `status` (`SMALLINT NOT NULL DEFAULT 1`): Status (`0 = CLOSED`, `1 = DRAFT`, `2 = OPEN`).
- `created_at`, `updated_at` (`TIMESTAMPTZ NOT NULL DEFAULT NOW()`): Audit timestamps.

#### Table: `applications`
Stores candidate applications and pipeline versioning.
- `id` (`BIGSERIAL PRIMARY KEY`): Auto-incrementing internal primary key.
- `job_id` (`BIGINT NOT NULL`): Foreign key matching `jobs.id`.
- `candidate_id` (`BIGINT NOT NULL`): Foreign key matching `profiles.id`.
- `resume_path` (`TEXT NULLABLE`): Path to stored PDF resume in Supabase Storage.
- `stage` (`SMALLINT NOT NULL DEFAULT 1`): Current pipeline stage (`1` through `5`).
- `version` (`INTEGER NOT NULL DEFAULT 1`): Optimistic Concurrency Control (OCC) counter.
- `created_at`, `updated_at` (`TIMESTAMPTZ NOT NULL DEFAULT NOW()`): Audit timestamps.
- **Database Unique Constraint**: `CONSTRAINT uq_applications_job_candidate UNIQUE (job_id, candidate_id)`.

#### Table: `candidate_profiles`
Stores extended candidate profile details in a 1-to-1 relationship with `profiles`.
- `id` (`BIGSERIAL PRIMARY KEY`): Auto-incrementing internal primary key.
- `profile_id` (`BIGINT NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE`): Foreign key enforcing 1-to-1 link to `profiles`.
- `full_name` (`VARCHAR(150) NOT NULL`): Candidate full name.
- `phone` (`VARCHAR(20) NULLABLE`), `skills` (`TEXT NULLABLE`), `experience` (`TEXT NULLABLE`), `resume_path` (`TEXT NULLABLE`).
- `created_at`, `updated_at` (`TIMESTAMPTZ NOT NULL DEFAULT NOW()`): Audit timestamps.

### 3.2 Concurrency & Duplicate Prevention Mechanisms
- **Optimistic Concurrency Control Counter (`applications.version`)**: Every stage update query increments `version` by 1 and includes `WHERE id = :id AND version = :expectedVersion`. If 0 rows are updated, the service layer detects concurrent modification and returns `HTTP 409 Conflict`.
- **Database Unique Constraint (`uq_applications_job_candidate`)**: Enforces at the database engine level that a candidate cannot apply to the same job twice. Under concurrent submission requests, PostgreSQL throws a unique constraint error, caught by `ApplicationService` to return `HTTP 409 Conflict`.

---

## 4. Database Indexing Strategy & Production Query Mapping

### 4.1 Actual Database Indexes

| Index Name | Target Table & Columns | Production REST API Route & Query | Purpose & Performance Value |
|---|---|---|---|
| **`idx_jobs_recruiter_id`** | `jobs (recruiter_id)` | `GET /api/jobs` (Recruiter dashboard tab): `SELECT * FROM jobs WHERE recruiter_id = :recruiterId ORDER BY created_at DESC LIMIT 10 OFFSET :offset` | Avoids sequential scans when recruiters load their posted job dashboard. |
| **`idx_applications_job_id`** | `applications (job_id)` | `GET /api/jobs/:id/export` (CSV export) & recruiter application views: `SELECT * FROM applications WHERE job_id = :jobId ORDER BY id ASC LIMIT 1000 OFFSET :offset` | Enables fast index range scans when retrieving applications for a specific job. |
| **`idx_applications_candidate_id`** | `applications (candidate_id)` | `GET /api/applications` (Candidate application tab): `SELECT * FROM applications WHERE candidate_id = :candidateId ORDER BY created_at DESC` | Enables fast candidate application history lookups. |
| **`idx_applications_stage`** | `applications (stage)` | `GET /api/applications` (Recruiter stage filter): `SELECT * FROM applications WHERE stage = :stage ...` | Speeds up stage filtering when recruiters filter applicants by stage enum. |
| **`uq_applications_job_candidate`** *(Unique Index)* | `applications (job_id, candidate_id)` | `POST /api/applications`: Checks existing application and enforces single submission constraint at DB level. | Provides efficient indexed lookup and database-level duplicate protection. |
| **`idx_candidate_profiles_profile_id`** | `candidate_profiles (profile_id)` | `GET /api/candidate-profile/me` & eager loading in `GET /api/applications`: `SELECT * FROM candidate_profiles WHERE profile_id = :profileId` | Speeds up 1-to-1 profile eager loading. |

### 4.2 Missing Search-Index Analysis & Production Recommendation

#### Current Implementation Finding
The `GET /api/jobs` endpoint supports candidate title search using Sequelize `Op.iLike` (`title ILIKE '%term%'`). Based on inspected database migrations ([`002_create_jobs.sql`](file:///c:/Users/91969/Documents/Engineering/Mini%20Application%20Tracker/applicant-tracker/supabase/migrations/002_create_jobs.sql)), **no index currently exists on `jobs.title` or `jobs.status`**.

#### Performance Impact at Scale
At assignment scale, sequential scans (`Seq Scan`) across small job tables complete quickly. However, at 50,000 jobs, executing leading-wildcard queries (`ILIKE '%term%'`) forces PostgreSQL to scan all 50,000 table pages, causing high disk I/O and query latency.

#### Recommended Future Production Indexing Options (Not Currently Implemented)
- **pg_trgm Trigram Index**: Create a GIN/GiST trigram index on `jobs.title` (`CREATE INDEX idx_jobs_title_trgm ON jobs USING gin (title gin_trgm_ops);`) to accelerate `ILIKE '%term%'` substring searches.
- **Composite Filter Index**: Create a composite index `CREATE INDEX idx_jobs_status_created ON jobs (status, created_at DESC);` to cover candidate job search queries filtering by `status = 2` sorted by creation date.

---

## 5. Pagination Architecture & Scale Bottleneck Analysis

### 5.1 Current Pagination Implementation
All paginated API routes (`GET /api/jobs`, `GET /api/applications`) and batch CSV export operations use server-side offset pagination via Sequelize `findAndCountAll`:
- Query parameters: `page` (default 1), `limit` (default 10).
- Calculated offset: `offset = (page - 1) * limit`.
- Server-side filtering (`WHERE` conditions) is applied before pagination limits.
- Batch CSV export uses database-level pagination batches of 1,000 records (`limit: 1000, offset: N`).

#### Implementation Advantages
- Simple, predictable API contract (`page`, `limit`, `total`, `totalPages`).
- Easy frontend UI integration with page numbers.
- Prevents loading entire candidate/job datasets into Node.js application memory.

---

### 5.2 Scale Bottleneck Analysis at 50,000 Jobs & 5,000,000 Applications

#### 1. `findAndCountAll` COUNT Query Overhead
Sequelize `findAndCountAll` issues two separate SQL queries:
1. `SELECT COUNT(DISTINCT "applications"."id") FROM applications JOIN ...`
2. `SELECT ... FROM applications JOIN ... LIMIT 10 OFFSET N`

At 5,000,000 applications, executing `COUNT(*)` across millions of rows requires scanning large index pages. Performing count queries on every page navigation becomes expensive and increases database CPU utilization.

#### 2. Deep `OFFSET` Query Degradation
In PostgreSQL, `OFFSET N` does not skip rows at the storage engine level. When a user requests page 50,000 (`OFFSET 500000, LIMIT 10`), PostgreSQL must read and walk past 500,000 index tuples before returning 10 rows. Query execution time degrades linearly ($O(N)$) as the offset increases.

#### Recommended Future Improvement: Keyset / Cursor Pagination
Keyset/cursor pagination avoids scanning and discarding large numbers of preceding rows and generally scales better for deep pagination.
- **Conceptual Keyset Query**:
  ```sql
  SELECT * FROM applications
  WHERE id > :lastSeenId AND job_id = :jobId
  ORDER BY id ASC
  LIMIT 10;
  ```

#### 3. Recruiter Job ID IN-List Query Bottleneck
In `ApplicationService.getApplications`, fetching applications for a recruiter executes `Job.findAll({ where: { recruiter_id }, attributes: ["id"] })` to collect all job IDs owned by the recruiter into a JavaScript array (`recruiterJobIds`), then passes `{ job_id: { [Op.in]: recruiterJobIds } }`.

If a recruiter owns thousands of jobs, passing a massive array into a SQL `IN (...)` clause degrades query parsing performance.
- **Recommended Future Improvement**: Replace two-step array fetching with a single SQL `JOIN` or `EXISTS` subquery:
  ```sql
  SELECT a.* FROM applications a
  JOIN jobs j ON a.job_id = j.id
  WHERE j.recruiter_id = :recruiterId;
  ```

---

### 5.3 Scale Summary Table

| Architectural Component | Current Implementation | Scale Bottleneck (50k Jobs / 5M Apps) | Recommended Future Production Architecture |
|---|---|---|---|
| **Pagination** | Offset-based (`LIMIT`, `OFFSET`) | Deep offsets (`OFFSET 500000`) force scanning 500k preceding index rows. | Keyset / Cursor pagination (`WHERE id > :lastId`). |
| **Total Record Count** | Sequelize `findAndCountAll` | `COUNT(*)` scans millions of rows on every page navigation. | Approximate counts (`reltuples`), cached counts, or count-less pagination. |
| **Job Search** | `ILIKE '%term%'` without index | Sequential table scan across 50,000 job title rows. | `pg_trgm` GIN trigram index or PostgreSQL Full-Text Search. |
| **Recruiter Ownership Query** | Two-pass JS array IN-list | Large `IN (id1, id2, ... idN)` arrays degrade SQL query execution. | SQL `JOIN jobs` or `EXISTS` subquery. |
| **CSV Data Export** | Batch DB pagination (1,000 rows) + response streaming | Sequential offset scanning for massive exports (100k+ rows). | Stream cursor / PostgreSQL server-side cursor (`pg-query-stream`). |
| **Resume Uploads** | Express buffer proxy → Storage | Express RAM (5MB per file) and server bandwidth bottleneck. | Direct Client Uploads using Short-Lived Signed Upload URLs. |
| **Email Processing** | In-process Promise retry loop + JSONL log | Process crash loses in-flight retries in Node memory. | Transactional Outbox Pattern + Distributed Queue (BullMQ/Redis) + Workers. |

---

## 6. Empirical Performance Benchmarks & Event-Loop Measurement (Part 3.3 Evidence)

### 6.1 Benchmark Methodology & Measured Environment
To evaluate Node.js event-loop responsiveness under heavy I/O load, Part 3.3 created a reproducible benchmark dataset of **10,000 candidate applications** for Job #22 using [`seedBenchmarkData.ts`](file:///c:/Users/91969/Documents/Engineering/Mini%20Application%20Tracker/applicant-tracker/backend/scripts/seedBenchmarkData.ts).

A standalone benchmark script ([`benchmarkCSV.ts`](file:///c:/Users/91969/Documents/Engineering/Mini%20Application%20Tracker/applicant-tracker/backend/scripts/benchmarkCSV.ts)) started an HTTP server on port 3099 and continuously executed lightweight HTTP GET requests to an in-memory `/api/health` endpoint every 5ms while the 10,000-application CSV export was running.

---

### 6.2 Empirical Measurement Results (10,000 Applications, 2.26 MB CSV)

The table below records the **exact measured benchmark outputs**:

| Benchmark Metric | Naive Implementation (Unpaginated Memory Load) | Optimized Implementation (Streaming + DB Pagination) |
|---|---|---|
| **Applications Exported** | **10,000** | **10,000** |
| **Total Downloaded CSV Size** | **2.26 MB** (2,374,872 bytes) | **2.26 MB** (2,374,872 bytes) |
| **CSV Export Duration** | **5,689.30 ms** | **10,801.04 ms** |
| **Baseline Health Latency (Before Export)** | **2.28 ms** | **1.37 ms** |
| **Average Health Latency During Export** | **1.40 ms** | **1.15 ms** |
| **Max Health Latency During Export** | **9.30 ms** | **26.75 ms** |
| **Health Requests Served During Export** | **395 requests** | **731 requests** |
| **Delayed Health Requests (>30ms)** | **0 requests** | **0 requests** |

---

### 6.3 Technical Analysis of Benchmark Results

#### 1. Health Request Throughput During Export
During the CSV export execution, the optimized streaming implementation served **731 health requests during the export window** compared to **395 requests** served during the naive export. Average health check latency remained virtually identical to baseline (**1.15 ms** vs **1.37 ms** baseline), with 0 requests exceeding 30ms latency.

#### 2. Understanding Export Duration (5.68s Naive vs 10.80s Optimized)
The measured single-request export duration was longer for the streaming implementation (10.80 seconds vs 5.68 seconds). This occurred because the optimized implementation executes 10 sequential paginated database queries (`limit: 1000, offset: N`) and pauses execution whenever Express TCP socket backpressure (`res.write() === false`) requires waiting for socket `drain` events.

This is an acceptable architectural tradeoff: the primary optimization goal was to **prevent event-loop starvation, avoid memory spikes, and maintain high server-wide request throughput**, rather than minimizing single-request execution duration.

#### 3. Data Transfer & Buffer Observations
- **Naive Export**: Executed `Application.findAll()`, loaded all 10,000 ORM instances into memory simultaneously, concatenated a 2.26 MB CSV string buffer in RAM, and sent it in a single response payload (`res.send()`).
- **Optimized Streaming Export**: Queried database rows in bounded batches of 1,000 records (~200 KB per batch chunk), formatted CSV rows on the fly, began writing CSV output incrementally as batches resolved, and released batch references to garbage collection before fetching subsequent pages.

*(Note: Batch chunk sizes of ~200 KB and 2.26 MB payload sizes are payload and chunk size observations derived from file length, not direct V8 heap memory snapshot measurements).*

---

## 7. Resume Upload Architecture

### 7.1 Current Implementation
1. **Client Request**: Candidate submits a PDF resume via `POST /api/profile/resume` as a `multipart/form-data` upload.
2. **Express & Multer Buffer**: Express processes the request using Multer in-memory storage (`Multer.memoryStorage()`), buffering the entire file binary into Node.js server RAM (`file.buffer`).
3. **Backend Validation**: `ResumeService` validates file existence, enforces a **5 MB size limit**, and verifies MIME type (`application/pdf`) and file extension (`.pdf`).
4. **Supabase Storage Proxy**: `StorageService` uploads `file.buffer` to the Supabase Storage private bucket `resumes` under path `${profileId}/resume.pdf`.
5. **Database Storage Path**: Backend saves the relative path (`uploadedPath`) in the `candidate_profiles` table.
6. **Signed URL Downloads**: When candidates or recruiters view resumes (`GET /api/profile/resume` or `GET /api/applications/:id/candidate-resume`), `StorageService` calls `createSignedUrl(storagePath, 60)` returning a **60-second short-lived signed URL** for private file access.

---

### 7.2 Recommended Production-Scale Architecture (Future Recommendation)

```
[ Client Browser ] ─── (1) POST /api/profile/resume/upload-url ───> [ Express Backend ]
        │                                                                   │
        │ <── (2) Return Short-Lived Signed Upload URL + Storage Path ──────┘
        │
        └─── (3) Direct Binary PUT Upload ───> [ Supabase Storage / S3 ]
                                                       │
[ Client Browser ] ─── (4) POST /api/profile/resume/confirm ───> [ Express Backend ]
                                                                            │
                                                                 (5) Save Path in PostgreSQL
```

#### Why Direct Signed Uploads Scale Better:
- **Removes Binary Traffic from Node.js**: Multipart file streams do not pass through Express server process memory or network interfaces.
- **Eliminates Memory Pressure**: Prevents Node.js V8 heap memory spikes caused by concurrent 5 MB file buffers.
- **Improves Horizontal Scalability**: Express instances handle only lightweight JSON API requests (~1 KB), allowing backend servers to scale independently of storage traffic.

---

## 8. Asynchronous Email Architecture

### 8.1 Current Implementation (Part 3.4)
- **Simulated Email Sender Stub**: `sendApplicationConfirmationEmail` simulates third-party transactional email delivery with an asynchronous 2-second delay (`setTimeout(2000)`) and a simulated **30% failure rate** (`Math.random() < 0.3`).
- **3-Attempt Retry with Increasing Backoff**: `sendConfirmationEmailWithRetry` implements a hand-written retry loop across 3 attempts with backoff delays (`[0ms, 1000ms, 2000ms]`).
- **Durable JSON Lines Failure Logging**: If all 3 attempts fail, `logEmailFailureDurably` writes a structured JSON Lines entry (`timestamp`, `applicationId`, `candidateEmail`, `jobTitle`, `attempt: 3`, `error`) to [`backend/logs/email-failures.log`](file:///c:/Users/91969/Documents/Engineering/Mini%20Application%20Tracker/applicant-tracker/backend/logs/email-failures.log) using non-blocking `fs.promises.appendFile`.
- **Non-Blocking Fire-and-Forget Dispatch**: `ApplicationService.createApplication` triggers the email delivery promise without `await` (`void emailService.sendConfirmationEmailWithRetry(...).catch(...)`). The HTTP route returns `HTTP 201 Created` in ~50ms without waiting for the 2-second email operation.

#### Current Limitation
Because background promises execute in Node.js process memory, if the backend server process crashes or restarts while a retry delay (`setTimeout`) is pending, the in-flight email task is lost.

---

### 8.2 Recommended Production-Scale Architecture (Future Recommendation)

```
HTTP POST /api/applications
         │
         v
┌─────────────────────────────────────────────────────────────┐
│              PostgreSQL Database Transaction                │
│  1. INSERT INTO applications VALUES (...)                   │
│  2. INSERT INTO transactional_outbox VALUES (email_payload) │
└─────────────────────────────────────────────────────────────┘
         │ (Transaction Commits)
         v
[ Outbox Publisher / Relayer Service ]
         │
         v
[ Distributed Message Queue (e.g. BullMQ / Redis / SQS) ]
         │
         v
[ Scalable Background Email Worker Processes ]
         │
         v
[ Transactional Email Provider (SendGrid / AWS SES) ] ── (If Max Failures) ──> [ Dead Letter Queue (DLQ) ]
```

#### Scaling Advantages of Outbox + Queue Architecture:
1. **Process Crash Durability**: Persistent queue storage (Redis/SQS) ensures pending email jobs survive backend application restarts.
2. **Rate Limit Control**: Queue workers consume email jobs at controlled rates matching provider API limits (e.g. 100 emails/sec).
3. **Atomicity**: The Transactional Outbox pattern ensures that the application record and the email intent are committed atomically. A separate publisher then delivers the outbox event to the queue.

---

## 9. Database Connection Pooling & Concurrency Controls

### 9.1 Actual Database Connection Configuration
In [`backend/src/config/database.ts`](file:///c:/Users/91969/Documents/Engineering/Mini%20Application%20Tracker/applicant-tracker/backend/src/config/database.ts), Sequelize is initialized as follows:
```typescript
const sequelize = new Sequelize(databaseUrl, {
  dialect: "postgres",
  logging: process.env.NODE_ENV === "development" ? console.log : false,
  dialectOptions: isRemote ? { ssl: { require: true, rejectUnauthorized: false } } : {},
  define: { timestamps: true, underscored: true },
});
```

#### Project Finding
No explicit `pool` configuration object is specified in `database.ts`. Sequelize falls back to its default connection pool settings (`max: 5`, `min: 0`, `acquire: 60000`, `idle: 10000`).

#### Production Connection Pool Considerations
In production environments with thousands of concurrent users, relying on default pool settings across multiple deployed backend instances can cause database connection exhaustion or client acquire timeouts. Explicit production pool parameters (`max`, `min`, `acquire`, `idle`) must be load-tested and configured in conjunction with external transaction poolers (such as Supabase PgBouncer / Supavisor) based on:
- PostgreSQL maximum server connection limits.
- Number of active Node.js cluster processes/containers.
- Peak concurrent HTTP request volume.

---

### 9.2 Implemented Concurrency Controls

#### 1. Bulk Application Stage Concurrency Limiter (Part 3.2)
- **Endpoint**: `POST /jobs/:id/applications/bulk-stage` (and legacy `PUT /api/applications/bulk-stage`).
- **Input Limit**: Accepts a payload of up to **50 application IDs**.
- **Handwritten Concurrency Limiter**: Uses [`mapWithConcurrency`](file:///c:/Users/91969/Documents/Engineering/Mini%20Application%20Tracker/applicant-tracker/backend/src/utils/concurrencyLimiter.ts) to restrict processing to a maximum of **5 in-flight application operations** simultaneously without external libraries (`p-limit`).
- **Behavior**: Preserves input array order and isolates per-item errors, returning a structured summary (`{ totalProcessed, succeeded, failed, results }`).

#### 2. Server-Side Optimistic Concurrency Control (Part 3.5)
- **Version Column**: `applications.version` (`INTEGER NOT NULL DEFAULT 1`).
- **Atomic Conditional Query**:
  ```sql
  UPDATE applications
  SET stage = :numericStage, version = expectedVersion + 1, updated_at = NOW()
  WHERE id = :id AND version = :expectedVersion;
  ```
- **Race Condition Safety**: If two recruiters submit concurrent updates for the same application, the first request succeeds (version increments to 2). The second request evaluates `WHERE version = 1`, matches 0 rows (`affectedCount === 0`), and is rejected with `HTTP 409 Conflict` (`"Conflict: Application was modified by another request (version mismatch)"`).

---

## 10. Real Time-Pressure Architectural Tradeoffs

The following three tradeoffs reflect actual architectural decisions made during project development:

### Tradeoff 1: Server-Side Offset Pagination over Keyset/Cursor Pagination
- **Decision**: Implemented standard `limit` and `offset` pagination (`(page - 1) * limit`) for API endpoints and batch CSV streaming.
- **Rationale**: Simple to implement, compatible with page-number UI navigation, and fully sufficient for assignment dataset sizes.
- **Tradeoff**: Trade-off between rapid implementation vs deep-page scalability (`OFFSET 500000` performance degradation at millions of rows).

### Tradeoff 2: Backend-Mediated Resume Upload Buffering over Direct Client Signed Upload URLs
- **Decision**: Implemented file uploads through Express using Multer memory storage (`Multer.memoryStorage()`), proxying buffers to Supabase Storage.
- **Rationale**: Kept file validation logic centralized on the backend and avoided complex pre-signed URL upload negotiation flows between frontend, backend, and storage provider.
- **Tradeoff**: Trade-off between implementation simplicity vs Express server RAM and bandwidth consumption under high upload concurrency.

### Tradeoff 3: In-Process Email Retry Loop & Local File Logging over Distributed Queue Cluster (BullMQ/Redis)
- **Decision**: Implemented an in-process Promise backoff retry loop with append logging to [`backend/logs/email-failures.log`](file:///c:/Users/91969/Documents/Engineering/Mini%20Application%20Tracker/applicant-tracker/backend/logs/email-failures.log).
- **Rationale**: Fulfilled non-blocking fire-and-forget email delivery requirements without adding external infrastructure dependencies (Redis cluster, worker processes, BullMQ).
- **Tradeoff**: Trade-off between minimal infrastructure complexity vs process-crash durability for background retries.
