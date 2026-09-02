import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function runBulkStageConcurrencyTests() {
  const { mapWithConcurrency } = await import("../src/utils/concurrencyLimiter");
  const { applicationService } = await import("../src/services/applicationService");
  const { ApplicationStage, UserRole } = await import("../src/types/commonEnum");
  const { default: sequelize } = await import("../src/config/database");
  const { Profile } = await import("../src/models/Profile");
  const { Job } = await import("../src/models/Job");
  const { CandidateProfile } = await import("../src/models/CandidateProfile");
  const { Application } = await import("../src/models/Application");

  console.log("==================================================");
  console.log("RUNNING PART 3.2 — BULK STAGE CONCURRENCY LIMITER AUTOMATED TESTS");
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

  // --- TEST 1: Maximum Active Concurrency Ceiling <= 5 ---
  console.log("--- Scenario 1: Manual Limiter Active Concurrency Check ---");
  let activeOperations = 0;
  let maximumObserved = 0;
  const numTasks = 20;
  const taskIds = Array.from({ length: numTasks }, (_, i) => i + 1);

  const limiterResults = await mapWithConcurrency(taskIds, 5, async (id) => {
    activeOperations++;
    maximumObserved = Math.max(maximumObserved, activeOperations);
    // Simulate async work
    await new Promise((resolve) => setTimeout(resolve, 30));
    activeOperations--;
    return { id, processed: true };
  });

  assert(
    maximumObserved <= 5,
    "Maximum Concurrency Constraint",
    `(Observed max in-flight = ${maximumObserved}, expected <= 5)`
  );
  assert(
    limiterResults.length === numTasks,
    "All Tasks Completed",
    `(${limiterResults.length} / ${numTasks} tasks completed)`
  );

  // --- TEST 2: Result Order Preservation (Out-of-Order Completion) ---
  console.log("\n--- Scenario 2: Result Order Preservation ---");
  const inputIds = [101, 102, 103, 104];
  const completionDelays = [80, 20, 60, 10]; // ID 104 finishes first, ID 101 finishes last

  const orderedResults = await mapWithConcurrency(inputIds, 5, async (id, index) => {
    const delay = completionDelays[index];
    await new Promise((resolve) => setTimeout(resolve, delay));
    return { id, delayFinished: delay };
  });

  assert(
    orderedResults[0].id === 101 &&
      orderedResults[1].id === 102 &&
      orderedResults[2].id === 103 &&
      orderedResults[3].id === 104,
    "Input Order Preservation",
    `(Result order strictly matches input: ${orderedResults.map((r) => r.id).join(",")})`
  );

  // --- TEST 3: Up to 50 IDs Accepted / > 50 IDs Rejected ---
  console.log("\n--- Scenario 3: Request Batch Size Limits (1..50) ---");
  const FiftyOneIds = Array.from({ length: 51 }, (_, i) => i + 1000);

  let error51 = "";
  try {
    await applicationService.bulkUpdateApplicationStage(1, {
      applicationIds: FiftyOneIds,
      stage: ApplicationStage.INTERVIEW,
    });
  } catch (err: any) {
    error51 = err.message;
  }

  assert(
    error51.includes("50"),
    "Reject >50 Application IDs with HTTP 400 Validation Error",
    `("${error51}")`
  );

  // --- TEST 4 & 5: Failure Isolation & Authorization (Database Integration) ---
  console.log("\n--- Scenario 4: Failure Isolation & Authorization Checks ---");

  // Ensure DB connected & set up test records
  await sequelize.authenticate();
  await import("../src/models/Associations");

  const timestamp = Date.now();

  // Create test recruiter A
  const recruiterA = await Profile.create({
    auth_user_id: `00000000-0000-0000-0000-${timestamp.toString().padStart(12, "0").slice(-12)}`,
    email: `recruiter_a_${timestamp}@example.com`,
    role: UserRole.RECRUITER,
  });

  // Create test recruiter B
  const recruiterB = await Profile.create({
    auth_user_id: `00000000-0000-0000-0001-${timestamp.toString().padStart(12, "0").slice(-12)}`,
    email: `recruiter_b_${timestamp}@example.com`,
    role: UserRole.RECRUITER,
  });

  // Create test candidates
  const candidate1 = await Profile.create({
    auth_user_id: `00000000-0000-0000-0002-${timestamp.toString().padStart(12, "0").slice(-12)}`,
    email: `candidate1_${timestamp}@example.com`,
    role: UserRole.CANDIDATE,
  });
  await CandidateProfile.create({
    profile_id: candidate1.id,
    full_name: "Test Candidate One",
  });

  const candidate2 = await Profile.create({
    auth_user_id: `00000000-0000-0000-0003-${timestamp.toString().padStart(12, "0").slice(-12)}`,
    email: `candidate2_${timestamp}@example.com`,
    role: UserRole.CANDIDATE,
  });
  await CandidateProfile.create({
    profile_id: candidate2.id,
    full_name: "Test Candidate Two",
  });

  // Create Job owned by Recruiter A
  const jobA = await Job.create({
    recruiter_id: recruiterA.id,
    title: "Software Engineer",
    description: "Full-stack developer",
    status: 1,
  });

  // Create Job owned by Recruiter B
  const jobB = await Job.create({
    recruiter_id: recruiterB.id,
    title: "DevOps Engineer",
    description: "Cloud engineer",
    status: 1,
  });

  // Create applications (unique candidate per job)
  const appA1 = await Application.create({
    job_id: jobA.id,
    candidate_id: candidate1.id,
    stage: ApplicationStage.APPLIED,
    version: 1,
  });
  const appA2 = await Application.create({
    job_id: jobA.id,
    candidate_id: candidate2.id,
    stage: ApplicationStage.APPLIED,
    version: 1,
  });
  const appB1 = await Application.create({
    job_id: jobB.id,
    candidate_id: candidate1.id,
    stage: ApplicationStage.APPLIED,
    version: 1,
  });
  const nonExistentAppId = 9999999;

  // Batch request from Recruiter A with mixed ownership, invalid ID, and valid IDs
  const mixedBatchIds = [Number(appA1.id), nonExistentAppId, Number(appB1.id), Number(appA2.id)];

  const bulkResponse = await applicationService.bulkUpdateApplicationStage(
    recruiterA.id,
    {
      applicationIds: mixedBatchIds,
      stage: ApplicationStage.SCREENING,
    }
  );

  assert(
    bulkResponse.updatedCount === 2,
    "Partial Success Count",
    `(Expected 2 updated, got ${bulkResponse.updatedCount})`
  );
  assert(
    bulkResponse.results.length === 4,
    "Per-ID Results Length",
    `(Got ${bulkResponse.results.length} results)`
  );

  // Result 0: appA1 -> success
  assert(
    Number(bulkResponse.results[0].application_id) === Number(appA1.id) && bulkResponse.results[0].success === true,
    "App A1 Success",
    `(ID ${appA1.id} updated to SCREENING)`
  );

  // Result 1: nonExistentAppId -> failed
  assert(
    Number(bulkResponse.results[1].application_id) === nonExistentAppId &&
      bulkResponse.results[1].success === false &&
      Boolean(bulkResponse.results[1].error?.includes("could not be found")),
    "Non-Existent App Failure Isolation",
    `(ID ${nonExistentAppId} error: "${bulkResponse.results[1].error}")`
  );

  // Result 2: appB1 -> forbidden (owned by Recruiter B)
  assert(
    Number(bulkResponse.results[2].application_id) === Number(appB1.id) &&
      bulkResponse.results[2].success === false &&
      Boolean(bulkResponse.results[2].error?.includes("Forbidden")),
    "Unowned Job Application Authorization Check",
    `(ID ${appB1.id} error: "${bulkResponse.results[2].error}")`
  );

  // Result 3: appA2 -> success
  assert(
    Number(bulkResponse.results[3].application_id) === Number(appA2.id) && bulkResponse.results[3].success === true,
    "App A2 Success",
    `(ID ${appA2.id} updated to SCREENING despite preceding failures)`
  );

  // Clean up created DB records
  await Application.destroy({ where: { id: [appA1.id, appA2.id, appB1.id] } });
  await Job.destroy({ where: { id: [jobA.id, jobB.id] } });
  await CandidateProfile.destroy({ where: { profile_id: [candidate1.id, candidate2.id] } });
  await Profile.destroy({ where: { id: [recruiterA.id, recruiterB.id, candidate1.id, candidate2.id] } });

  console.log("\n==================================================");
  console.log(`ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log("==================================================\n");

  // Explicitly close DB connection to allow clean script termination
  await sequelize.close();
}

runBulkStageConcurrencyTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
