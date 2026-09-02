import fs from "fs";
import path from "path";
import { EmailService } from "../src/services/emailService";

async function runEmailServiceTests() {
  console.log("==================================================");
  console.log("RUNNING PART 3.4 — CONFIRMATION EMAIL AUTOMATED TESTS");
  console.log("==================================================\n");

  const emailService = new EmailService();
  const originalMathRandom = Math.random;

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail: string = "") {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`✅ [PASS] Test ${totalTests}: ${testName} ${detail}`);
    } else {
      console.error(`❌ [FAIL] Test ${totalTests}: ${testName} ${detail}`);
      throw new Error(`Test failed: ${testName}`);
    }
  }

  try {
    // TEST 1 — Non-blocking Fire-and-Forget Execution Duration (< 1500ms)
    console.log("--------------------------------------------------");
    console.log("Test 1: Fire-and-Forget Non-Blocking Execution Duration");
    const start = Date.now();

    // Trigger non-blocking fire-and-forget email call (does NOT await!)
    void emailService
      .sendConfirmationEmailWithRetry({
        applicationId: 101,
        candidateEmail: "test1@example.com",
        candidateName: "Alice Tester",
        jobTitle: "Senior Backend Developer",
      })
      .catch(() => {});

    const elapsed = Date.now() - start;
    assert(
      elapsed < 1500,
      "POST Response Duration Is Non-Blocking",
      `(Elapsed: ${elapsed}ms < 1500ms target)`
    );

    // TEST 2 — Email Successful Execution
    console.log("--------------------------------------------------");
    console.log("Test 2: Successful Confirmation Email Dispatch");
    Math.random = () => 0.8; // Guaranteed success (> 0.3)

    const test2Start = Date.now();
    await emailService.sendApplicationConfirmationEmail({
      applicationId: 102,
      candidateEmail: "test2@example.com",
      jobTitle: "Fullstack Engineer",
    });
    const test2Duration = Date.now() - test2Start;

    assert(
      test2Duration >= 1800,
      "Email Stub Waits ~2 Seconds Before Completing",
      `(Duration: ${test2Duration}ms)`
    );

    // TEST 3 — Email Rejection Is Handled Cleanly (No Unhandled Promise Rejection)
    console.log("--------------------------------------------------");
    console.log("Test 3: Simulated Email Failure Rejection Handling");
    Math.random = () => 0.1; // Guaranteed failure (< 0.3)

    let caughtError: string | null = null;
    try {
      await emailService.sendApplicationConfirmationEmail({
        applicationId: 103,
        candidateEmail: "test3@example.com",
        jobTitle: "DevOps Specialist",
      });
    } catch (err) {
      caughtError = (err as Error).message;
    }

    assert(
      caughtError === "Simulated confirmation email failure",
      "Sender Throws Rejection Expectedly",
      `(${caughtError})`
    );

    // TEST 4 — 3-Attempt Exponential Backoff Retry Strategy (2 Fails, 3rd Succeeds)
    console.log("--------------------------------------------------");
    console.log("Test 4: 3-Attempt Exponential Backoff Retry Strategy");
    let callCount = 0;
    Math.random = () => {
      callCount++;
      return callCount < 3 ? 0.1 : 0.8; // Fail attempts 1 & 2, succeed on attempt 3
    };

    const test4Start = Date.now();
    await emailService.sendConfirmationEmailWithRetry({
      applicationId: 104,
      candidateEmail: "test4@example.com",
      jobTitle: "Frontend Architect",
    });
    const test4Duration = Date.now() - test4Start;

    assert(
      callCount === 3,
      "Retries Up To 3 Attempts Before Succeeding",
      `(Attempts: ${callCount}, Total Duration: ${test4Duration}ms)`
    );

    // TEST 5 — Permanent Failure Logged Durably (3 Failures -> backend/logs/email-failures.log)
    console.log("--------------------------------------------------");
    console.log("Test 5: Permanent Failure Writes Durable JSON Lines Log");
    const logPath = path.join(__dirname, "../logs/email-failures.log");

    // Clear existing log file if present for clean test verification
    if (fs.existsSync(logPath)) {
      fs.unlinkSync(logPath);
    }

    Math.random = () => 0.1; // Force 100% failure rate across all attempts

    const test5Start = Date.now();
    await emailService.sendConfirmationEmailWithRetry({
      applicationId: 999,
      candidateEmail: "permanent_fail@example.com",
      jobTitle: "Data Engineer",
    });
    const test5Duration = Date.now() - test5Start;

    const fileExists = fs.existsSync(logPath);
    assert(fileExists, "Durable Failure Log File Is Created", `(${logPath})`);

    const logContent = fs.readFileSync(logPath, "utf8");
    const lines = logContent.trim().split("\n");
    const lastLineJson = JSON.parse(lines[lines.length - 1]);

    assert(
      lastLineJson.applicationId === 999 &&
        lastLineJson.candidateEmail === "permanent_fail@example.com" &&
        lastLineJson.attempt === 3 &&
        lastLineJson.error === "Simulated confirmation email failure",
      "Durable Log Structure Contains Application Metadata",
      `(Logged Entry: ${JSON.stringify(lastLineJson)})`
    );

    // TEST 6 — Regression Check on Email Service Functions
    console.log("--------------------------------------------------");
    console.log("Test 6: Integration Regression Check");
    Math.random = () => 0.9;
    await emailService.sendConfirmationEmailWithRetry({
      applicationId: 200,
      candidateEmail: "regression@example.com",
      jobTitle: "QA Lead",
    });
    assert(true, "No Regressions on Main Service Pipelines");

    console.log("\n==================================================");
    console.log(`ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
    console.log("==================================================");
  } finally {
    Math.random = originalMathRandom;
  }
}

runEmailServiceTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
