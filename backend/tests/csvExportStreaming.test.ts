import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function runCSVExportStreamingTests() {
  const { escapeCSVField, formatCSVHeaderRow } = await import("../src/utils/csvHelper");
  const { applicationService } = await import("../src/services/applicationService");
  const { ApplicationStage, UserRole } = await import("../src/types/commonEnum");
  const { default: sequelize } = await import("../src/config/database");
  const { Profile } = await import("../src/models/Profile");
  const { Job } = await import("../src/models/Job");
  const { CandidateProfile } = await import("../src/models/CandidateProfile");
  const { Application } = await import("../src/models/Application");
  await import("../src/models/Associations");

  console.log("==================================================");
  console.log("RUNNING PART 3.3 — CSV EXPORT STREAMING & PAGINATION AUTOMATED TESTS");
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

  // --- TEST 1: RFC 4180 CSV Escaping Helper ---
  console.log("--- Scenario 1: CSV Field Escaping Rules ---");
  assert(
    escapeCSVField("Normal Text") === "Normal Text",
    "Plain string without special chars remains unquoted",
    `("Normal Text")`
  );
  assert(
    escapeCSVField("Software, Engineer") === '"Software, Engineer"',
    "Commas are wrapped in quotes",
    `("Software, Engineer")`
  );
  assert(
    escapeCSVField('Developer "Senior"') === '"Developer ""Senior"""',
    "Double quotes are doubled and field wrapped in quotes",
    `('Developer "Senior"')`
  );
  assert(
    escapeCSVField("Line 1\nLine 2") === '"Line 1\nLine 2"',
    "Newlines are wrapped in quotes",
    `("Line 1\\nLine 2")`
  );
  assert(
    escapeCSVField(null) === "" && escapeCSVField(undefined) === "",
    "Null and undefined yield empty string",
    `(null/undefined)`
  );

  // --- TEST 2: Header Formatting ---
  assert(
    formatCSVHeaderRow() === "Job Title,Candidate Name,Candidate Email,Phone,Skills,Experience,Stage,Applied Date\n",
    "CSV Header Row Formatting",
    `("${formatCSVHeaderRow().trim()}")`
  );

  // --- TEST 3: DB Setup & Authorization Checks ---
  console.log("\n--- Scenario 2: DB Pagination & Authorization Checks ---");
  await sequelize.authenticate();

  const timestamp = Date.now();

  // Create recruiter 1
  const recruiter1 = await Profile.create({
    auth_user_id: `00000000-0000-0000-0003-${timestamp.toString(16).padStart(12, "0").slice(-12)}`,
    email: `csv_recruiter1_${timestamp}@example.com`,
    role: UserRole.RECRUITER,
  });

  // Create recruiter 2
  const recruiter2 = await Profile.create({
    auth_user_id: `00000000-0000-0000-0004-${timestamp.toString(16).padStart(12, "0").slice(-12)}`,
    email: `csv_recruiter2_${timestamp}@example.com`,
    role: UserRole.RECRUITER,
  });

  // Create job owned by Recruiter 1
  const job1 = await Job.create({
    recruiter_id: recruiter1.id,
    title: 'Lead Architect "Cloud"',
    description: "Cloud architect role",
    status: 1,
  });

  // Create job owned by Recruiter 2
  const job2 = await Job.create({
    recruiter_id: recruiter2.id,
    title: "DevOps Lead",
    description: "DevOps role",
    status: 1,
  });

  // Create 3 candidates for Job 1
  const candidateApps = [];
  for (let i = 1; i <= 3; i++) {
    const cand = await Profile.create({
      auth_user_id: `00000000-0000-0000-0005-${(timestamp + i).toString(16).padStart(12, "0").slice(-12)}`,
      email: `csv_candidate_${i}_${timestamp}@example.com`,
      role: UserRole.CANDIDATE,
    });
    await CandidateProfile.create({
      profile_id: cand.id,
      full_name: `Candidate, John ${i}`,
      phone: "+1-555-0100",
      skills: "C++, Python",
      experience: "5 years",
    });
    const app = await Application.create({
      job_id: job1.id,
      candidate_id: cand.id,
      stage: ApplicationStage.INTERVIEW,
      version: 1,
    });
    candidateApps.push({ cand, app });
  }

  // TEST 4: Recruiter 1 exporting own Job 1 batch (DB Pagination)
  const batchResult = await applicationService.exportApplicationsBatch(
    recruiter1.id,
    { job_id: job1.id },
    0,
    10
  );

  assert(
    batchResult.totalCount === 3,
    "Database findAndCountAll returns correct totalCount",
    `(Expected 3, got ${batchResult.totalCount})`
  );
  assert(
    batchResult.applications.length === 3,
    "Paginated query returns 3 items for batch size 10",
    `(Got ${batchResult.applications.length})`
  );
  assert(
    batchResult.applications[0].job?.title === 'Lead Architect "Cloud"',
    "Eager loaded associations (Job & Candidate) populated",
    `("${batchResult.applications[0].job?.title}")`
  );

  // TEST 5: CSV Row Formatting check
  const formattedRow = applicationService.formatApplicationCSVRow(batchResult.applications[0]);
  assert(
    formattedRow.includes('"Lead Architect ""Cloud"""') && formattedRow.includes('"Candidate, John 1"'),
    "Row formatting escapes quotes and commas correctly",
    `("${formattedRow.trim()}")`
  );

  // TEST 6: Unowned Job Authorization Enforcement
  let forbiddenError = "";
  try {
    await applicationService.exportApplicationsBatch(
      recruiter1.id,
      { job_id: job2.id },
      0,
      10
    );
  } catch (err: any) {
    forbiddenError = err.message;
  }

  assert(
    forbiddenError.includes("Forbidden"),
    "Exporting unowned job raises HTTP 403 Forbidden error",
    `("${forbiddenError}")`
  );

  // TEST 7: DB Pagination Limit & Offset Check
  const page1 = await applicationService.exportApplicationsBatch(recruiter1.id, { job_id: job1.id }, 0, 2);
  const page2 = await applicationService.exportApplicationsBatch(recruiter1.id, { job_id: job1.id }, 2, 2);

  assert(
    page1.applications.length === 2 && page2.applications.length === 1,
    "Database limit and offset pagination splits records accurately across pages",
    `(Page 1: ${page1.applications.length}, Page 2: ${page2.applications.length})`
  );
  assert(
    page1.applications[0].id !== page2.applications[0].id,
    "Paginated pages contain distinct records",
    `(Page 1 first ID: ${page1.applications[0].id}, Page 2 first ID: ${page2.applications[0].id})`
  );

  // Clean up test DB records
  for (const { cand, app } of candidateApps) {
    await Application.destroy({ where: { id: app.id } });
    await CandidateProfile.destroy({ where: { profile_id: cand.id } });
    await Profile.destroy({ where: { id: cand.id } });
  }
  await Job.destroy({ where: { id: [job1.id, job2.id] } });
  await Profile.destroy({ where: { id: [recruiter1.id, recruiter2.id] } });

  console.log("\n==================================================");
  console.log(`ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log("==================================================\n");

  await sequelize.close();
}

runCSVExportStreamingTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
