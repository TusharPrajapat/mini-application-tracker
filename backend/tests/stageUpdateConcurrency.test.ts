import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function runStageUpdateConcurrencyTests() {
  const { applicationService } = await import("../src/services/applicationService");
  const { ApplicationStage, UserRole } = await import("../src/types/commonEnum");
  const { default: sequelize } = await import("../src/config/database");
  const { Profile } = await import("../src/models/Profile");
  const { Job } = await import("../src/models/Job");
  const { Application } = await import("../src/models/Application");
  await import("../src/models/Associations");

  console.log("==================================================");
  console.log("RUNNING PART 3.5 — RACE CONDITION & CONCURRENCY CONTROL TESTS");
  console.log("==================================================\n");

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

  await sequelize.authenticate();

  const timestamp = Date.now();

  // Create recruiter profile
  const recruiter = await Profile.create({
    auth_user_id: `00000000-0000-0000-0006-${timestamp.toString(16).padStart(12, "0").slice(-12)}`,
    email: `race_recruiter_${timestamp}@example.com`,
    role: UserRole.RECRUITER,
  });

  // Create unowned recruiter profile
  const unauthorizedRecruiter = await Profile.create({
    auth_user_id: `00000000-0000-0000-0007-${timestamp.toString(16).padStart(12, "0").slice(-12)}`,
    email: `unauth_recruiter_${timestamp}@example.com`,
    role: UserRole.RECRUITER,
  });

  // Create job owned by recruiter
  const job = await Job.create({
    recruiter_id: recruiter.id,
    title: "Senior Concurrency Engineer",
    description: "Race condition test role",
    status: 1,
  });

  // Create candidate profile
  const candidate = await Profile.create({
    auth_user_id: `00000000-0000-0000-0008-${timestamp.toString(16).padStart(12, "0").slice(-12)}`,
    email: `candidate_race_${timestamp}@example.com`,
    role: UserRole.CANDIDATE,
  });

  // Create initial application (stage: APPLIED, version: 1)
  const application = await Application.create({
    job_id: job.id,
    candidate_id: candidate.id,
    stage: ApplicationStage.APPLIED,
    version: 1,
  });

  console.log(`Created Application ID #${application.id} for Job #${job.id} (Initial Stage: APPLIED, Version: 1)\n`);

  // ==================================================
  // SCENARIO 1: DEMONSTRATE UNFIXED NAIVE LOST UPDATE RACE CONDITION
  // ==================================================
  console.log("--- Scenario 1: Unfixed Naive Read-Then-Write (Lost Update Demonstration) ---");

  // Deterministic promise barrier sequence:
  // 1. Req A reads initial state (APPLIED = 1)
  // 2. Req B reads initial state (APPLIED = 1)
  // 3. Req A writes stage = SCREENING (2)
  // 4. Req B writes stage = REJECTED (5)
  let readCount = 0;
  let releaseReqAWrites: () => void;
  let releaseReqBWrites: () => void;

  const reqAWriteBarrier = new Promise<void>((r) => { releaseReqAWrites = r; });
  const reqBWriteBarrier = new Promise<void>((r) => { releaseReqBWrites = r; });

  const naiveTaskA = applicationService.updateApplicationStageNaive(
    application.id,
    recruiter.id,
    { stage: ApplicationStage.SCREENING },
    {
      onPostRead: async () => {
        readCount++;
        await reqAWriteBarrier;
      },
    }
  );

  const naiveTaskB = applicationService.updateApplicationStageNaive(
    application.id,
    recruiter.id,
    { stage: ApplicationStage.REJECTED },
    {
      onPostRead: async () => {
        readCount++;
        if (readCount === 2) {
          // Both reads complete! Release Request A to write
          releaseReqAWrites();
        }
      },
      onPreWrite: async () => {
        // Wait until Request A completes write before Request B writes
        await reqBWriteBarrier;
      },
    }
  );

  naiveTaskA.then(() => {
    // When Req A write completes, release Req B write
    releaseReqBWrites();
  });

  const [naiveResA, naiveResB] = await Promise.all([naiveTaskA, naiveTaskB]);

  assert(
    naiveResA.stage === ApplicationStage.SCREENING && naiveResB.stage === ApplicationStage.REJECTED,
    "Both naive concurrent requests return 200 OK without conflict detection",
    `(Req A returned stage ${naiveResA.stage}, Req B returned stage ${naiveResB.stage})`
  );

  const reloadedAppNaive = await Application.findByPk(application.id);
  assert(
    reloadedAppNaive?.stage === ApplicationStage.REJECTED,
    "Naive execution causes Lost Update: Request B silently overwrote Request A",
    `(Final DB stage: ${reloadedAppNaive?.stage})`
  );

  // ==================================================
  // SCENARIO 2: FIXED OPTIMISTIC CONCURRENCY CONTROL (OCC)
  // ==================================================
  console.log("\n--- Scenario 2: Fixed Optimistic Concurrency Control (OCC) Protection ---");

  // Reset application to stage APPLIED (1) and version 1
  await application.update({ stage: ApplicationStage.APPLIED, version: 1 });

  // Fire Request A and Request B concurrently passing expected version: 1
  const occTaskA = applicationService.updateApplicationStage(
    application.id,
    recruiter.id,
    { stage: ApplicationStage.SCREENING, version: 1 }
  );

  const occTaskB = applicationService.updateApplicationStage(
    application.id,
    recruiter.id,
    { stage: ApplicationStage.REJECTED, version: 1 }
  );

  const occResults = await Promise.allSettled([occTaskA, occTaskB]);

  const fulfilledCount = occResults.filter((r) => r.status === "fulfilled").length;
  const rejectedCount = occResults.filter((r) => r.status === "rejected").length;

  assert(
    fulfilledCount === 1,
    "Exactly one concurrent request succeeds (HTTP 200 OK)",
    `(Fulfilled count: ${fulfilledCount})`
  );

  assert(
    rejectedCount === 1,
    "Exactly one concurrent request fails with Conflict",
    `(Rejected count: ${rejectedCount})`
  );

  const rejectedResult = occResults.find((r) => r.status === "rejected") as PromiseRejectedResult;
  assert(
    rejectedResult.reason.message.includes("Conflict"),
    "Losing request receives HTTP 409 Conflict version mismatch error",
    `("${rejectedResult.reason.message}")`
  );

  const finalAppOcc = await Application.findByPk(application.id);
  assert(
    finalAppOcc?.version === 2,
    "Database version is incremented exactly once (version 1 -> 2)",
    `(Final version: ${finalAppOcc?.version})`
  );

  assert(
    finalAppOcc?.stage === ApplicationStage.SCREENING || finalAppOcc?.stage === ApplicationStage.REJECTED,
    "Database stage matches winning request stage",
    `(Final stage: ${finalAppOcc?.stage})`
  );

  // ==================================================
  // SCENARIO 3: API CONTRACT & VALIDATION CHECKS
  // ==================================================
  console.log("\n--- Scenario 3: API Contracts & Edge Case Validation ---");

  // Test 3.1: Invalid Stage Value
  let invalidStageError = "";
  try {
    await applicationService.updateApplicationStage(application.id, recruiter.id, {
      stage: 99 as any,
      version: 2,
    });
  } catch (err: any) {
    invalidStageError = err.message;
  }
  assert(
    invalidStageError.includes("Invalid stage value"),
    "Rejects invalid stage value with HTTP 400 validation error",
    `("${invalidStageError}")`
  );

  // Test 3.2: Missing/Invalid Version
  let invalidVersionError = "";
  try {
    await applicationService.updateApplicationStage(application.id, recruiter.id, {
      stage: ApplicationStage.INTERVIEW,
      version: 0,
    });
  } catch (err: any) {
    invalidVersionError = err.message;
  }
  assert(
    invalidVersionError.includes("version is required"),
    "Rejects invalid version with HTTP 400 validation error",
    `("${invalidVersionError}")`
  );

  // Test 3.3: Unauthorized Recruiter (Unowned Job)
  let unauthorizedError = "";
  try {
    await applicationService.updateApplicationStage(application.id, unauthorizedRecruiter.id, {
      stage: ApplicationStage.INTERVIEW,
      version: 2,
    });
  } catch (err: any) {
    unauthorizedError = err.message;
  }
  assert(
    unauthorizedError.includes("Forbidden"),
    "Rejects update by unauthorized recruiter with HTTP 403 Forbidden error",
    `("${unauthorizedError}")`
  );

  // Test 3.4: Nonexistent Application
  let notFoundError = "";
  try {
    await applicationService.updateApplicationStage(999999, recruiter.id, {
      stage: ApplicationStage.INTERVIEW,
      version: 1,
    });
  } catch (err: any) {
    notFoundError = err.message;
  }
  assert(
    notFoundError.includes("not found"),
    "Rejects nonexistent application ID with HTTP 404 Not Found error",
    `("${notFoundError}")`
  );

  // Clean up test DB records
  await Application.destroy({ where: { id: application.id } });
  await Job.destroy({ where: { id: job.id } });
  await Profile.destroy({ where: { id: [recruiter.id, unauthorizedRecruiter.id, candidate.id] } });

  console.log("\n==================================================");
  console.log(`ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log("==================================================\n");

  await sequelize.close();
}

runStageUpdateConcurrencyTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
