# Async Architecture & Requirement Specifications

This document outlines the planned design, implementation details, real-world application mapping, and testing strategies for the six asynchronous patterns required by Part 3 of the assignment.

---

## 3.1 Callback → Promise

### Problem
Legacy Node.js APIs (such as stream `pipe` completion events, `fs.readFile`/`fs.writeFile`, or legacy file upload SDKs) rely on traditional error-first callback conventions `(err, result) => void`. Modern TypeScript backend services rely on `async/await` syntax for clean asynchronous control flow and structured exception handling.

### Planned Implementation
A hand-written utility wrapper function `promisifyCallback` that wraps an error-first callback function into a native JavaScript `Promise`.
```typescript
// Conceptual design skeleton
export function promisifyCallback<T>(
  fn: (cb: (err: Error | null, result?: T) => void) => void
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    fn((err, result) => {
      if (err) return reject(err);
      resolve(result as T);
    });
  });
}
```

### Where It Will Be Used in the Real Application
In the `backend/src/utils/fileUpload.ts` and `backend/src/services/applicationService.ts` modules during PDF resume handling. When converting multipart stream buffer chunks or integrating legacy file validation/storage upload calls, this utility will convert callback-based streams into awaitable Promises during application submission.

### Testing Approach
- **Unit Tests**: Mock a legacy error-first callback function. Test successful resolution with payload and rejection when an error object is passed.
- **Integration Tests**: Simulate PDF resume upload processing in `applicationService.test.ts` and verify clean `try/catch` execution.

---

## 3.2 Concurrency Limiter

### Problem
When a recruiter selects dozens or hundreds of candidate applications for a bulk stage update (e.g. moving 50 candidates from `screening` to `interview`), firing all database `UPDATE` queries simultaneously can exhaust database connection pools, trigger rate limits, or overwhelm database resources.

### Planned Implementation
A custom, hand-written async task concurrency limiter class (`ConcurrencyLimiter` or `p-limit` equivalent without third-party library dependencies). The limiter maintains an active execution counter and a queue of pending tasks, ensuring a maximum of **5 operations in flight** at any single moment.

```typescript
// Conceptual design skeleton
export class ConcurrencyLimiter {
  private limit: number;
  private activeCount: number = 0;
  private queue: Array<() => void> = [];

  constructor(limit: number = 5) {
    this.limit = limit;
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.activeCount >= this.limit) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.activeCount++;
    try {
      return await fn();
    } finally {
      this.activeCount--;
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        next?.();
      }
    }
  }
}
```

### Where It Will Be Used in the Real Application
In `backend/src/services/applicationService.ts` within the `bulkUpdateStages` method. When a recruiter posts a batch of application stage transitions (`POST /api/applications/bulk-stage`), the service wraps each stage update inside the concurrency limiter before dispatching queries.

### Testing Approach
- **Unit Tests**: Create 20 mock tasks with synthetic delays (e.g. 50ms). Execute them via the limiter set to max 5. Assert that at no point in time does `activeCount` exceed 5, and verify all 20 tasks resolve correctly.
- **Integration Tests**: Trigger bulk stage update endpoints with 15 application IDs and track concurrent database active connections.

---

## 3.3 Event Loop / CSV

### Problem
Generating and exporting large CSV datasets (e.g. 10,000+ candidate applications) by accumulating strings in memory blocks the Node.js event loop, starves incoming HTTP requests, and can trigger out-of-memory (OOM) heap exceptions on the server.

### Planned Implementation
A streaming CSV generator using Node.js `Transform` streams and database cursor batching (`Readable.from` async generators). Application data is fetched in chunks (e.g., 500 rows per batch), transformed line-by-line into CSV format, and piped directly into the HTTP response stream (`res`).

```typescript
// Conceptual design skeleton
import { Transform } from 'stream';

export function createCSVStream(): Transform {
  let headerWritten = false;
  return new Transform({
    objectMode: true,
    transform(chunk, encoding, callback) {
      if (!headerWritten) {
        this.push('ID,Candidate ID,Job ID,Stage,Created At\n');
        headerWritten = true;
      }
      const row = `${chunk.id},${chunk.candidate_id},${chunk.job_id},${chunk.stage},${chunk.created_at}\n`;
      callback(null, row);
    }
  });
}
```

### Where It Will Be Used in the Real Application
In `backend/src/controllers/applicationController.ts` and `backend/src/services/applicationService.ts` for the endpoint `GET /api/applications/export-csv`. Enables recruiters to download large application datasets efficiently with `Transfer-Encoding: chunked`.

### Testing Approach
- **Unit Tests**: Stream 10,000 mock application records through the CSV transform stream and measure maximum memory heap usage and event loop latency.
- **Integration Tests**: Perform HTTP GET request to `/api/applications/export-csv` and verify chunked delivery, correct header formatting, and complete line counts.

---

## 3.4 Fire-and-Forget Email

### Problem
Sending transactional emails (such as application receipt confirmations to candidates or alert notifications to recruiters) via external email APIs adds significant network latency (300ms–2000ms). Synchronously waiting for email delivery before responding to candidate submission requests degrades user experience.

### Planned Implementation
A non-blocking, asynchronous fire-and-forget notification helper. The submission handler triggers the email dispatch asynchronously in the background without `await`ing its resolution, allowing the HTTP controller to immediately respond to the client with `201 Created`. Unhandled rejections are caught internally and logged to prevent node process crashes.

```typescript
// Conceptual design skeleton
export function sendApplicationEmailFireAndForget(emailPayload: EmailPayload): void {
  // Execute async task without blocking execution thread
  emailProvider.send(emailPayload).catch((error) => {
    console.error('[Email Queue Error] Failed to send async email:', error);
    // Optionally publish to retry queue / logger
  });
}
```

### Where It Will Be Used in the Real Application
In `backend/src/services/applicationService.ts` after successful execution of `createApplication`. Immediately after the application row is saved to PostgreSQL, the email trigger is dispatched asynchronously before returning the created application record.

### Testing Approach
- **Unit Tests**: Mock the email service provider with a delayed promise (e.g. 500ms). Verify that calling `sendApplicationEmailFireAndForget` returns synchronously within <5ms while the email provider eventual resolution completes in background.
- **Integration Tests**: Submit an application via POST `/api/applications` and verify HTTP response time is not impacted by mock email latency.

---

## 3.5 Race Condition

### Problem
If two recruiters or automated tools attempt to update the stage of the same application concurrently (e.g. Recruiter A moves stage from `screening` -> `interview` while Recruiter B moves stage from `screening` -> `rejected`), a race condition occurs. Without concurrency controls, one write silently overwrites the other, causing data inconsistency and invalid stage transitions.

### Planned Implementation
**Optimistic Locking** using an `applications.version` column (`INTEGER NOT NULL DEFAULT 1`).
Every stage update query includes the expected current version in its `WHERE` clause and increments `version` by 1:

```sql
UPDATE applications
SET stage = $new_stage, version = version + 1, updated_at = NOW()
WHERE id = $application_id AND version = $expected_version
RETURNING *;
```

If zero rows are modified by the query, the version has changed (indicating a concurrent modification). The service layer detects this, aborts the update, and throws an `OptimisticLockError` (HTTP 409 Conflict), prompting the user to refresh their view.

### Where It Will Be Used in the Real Application
In `backend/src/services/applicationService.ts` within the `updateStage` and `bulkUpdateStages` methods when processing stage updates for existing applications.

### Testing Approach
- **Race Condition Simulation Test**: Spawn two concurrent async update requests targeting the exact same application record with `version = 1`.
- **Expected Outcome**: Exactly one request succeeds (version updated to `2`), while the second request fails with `OptimisticLockError` (HTTP 409 Conflict).

---

## 3.6 Closures / Debounce

### Problem
As a candidate types into the job title search input box, triggering an API call on every single keystroke creates unnecessary server load, network congestion, and potential UI render stutter.

### Planned Implementation
A hand-written JavaScript closure-based `debounce` utility function (without relying on Lodash or external libraries). The function captures a `timer` variable within its lexical closure scope, clearing and resetting the timeout on each invocation.

```typescript
// Conceptual design skeleton
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      func(...args);
    }, delay);
  };
}
```

### Where It Will Be Used in the Real Application
In `frontend/src/hooks/useJobSearch.ts` and `frontend/src/pages/JobList.tsx` to wrap the search input handler. Delays API query execution by 300ms until the candidate pauses typing.

### Testing Approach
- **Unit Tests**: Using Jest/Vitest fake timers, invoke the debounced search function 10 times in rapid succession (e.g. 50ms intervals). Fast-forward time and verify that the target search callback is executed **exactly once**.
- **Frontend Component Tests**: Simulate rapid typing into the search input component and assert that backend API calls match debounced intervals.
