import { debounce } from "../../frontend/src/utils/debounce";

async function runDebounceStaleResponseTests() {
  console.log("==================================================");
  console.log("RUNNING PART 3.6 — DEBOUNCE & STALE RESPONSE AUTOMATED TESTS");
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

  // --- TEST 1: Rapid Calls Execute Exactly Once with Latest Value ---
  console.log(
    "--- Scenario 1: Handwritten Debounce Execution Count & Latest Arg ---",
  );
  const executions: string[] = [];
  const debouncedSearch = debounce((term: string) => {
    executions.push(term);
  }, 100);

  debouncedSearch("r");
  debouncedSearch("re");
  debouncedSearch("rea");
  debouncedSearch("reac");
  debouncedSearch("react");

  assert(
    executions.length === 0,
    "Target function is not invoked synchronously prior to delay expiration",
    `(Executions so far: ${executions.length})`,
  );

  // Wait 150ms for debounce timer to expire
  await new Promise((r) => setTimeout(r, 150));

  assert(
    executions.length === 1,
    "Underlying target function executed strictly ONCE for 5 rapid calls",
    `(Executions: ${executions.length})`,
  );
  assert(
    executions[0] === "react",
    "Executed with the final debounced argument 'react'",
    `("${executions[0]}")`,
  );

  // --- TEST 2: Timer Reset Behavior ---
  console.log("\n--- Scenario 2: Timer Reset on Intermittent Calls ---");
  const resetExecutions: string[] = [];
  const debouncedReset = debounce((term: string) => {
    resetExecutions.push(term);
  }, 100);

  debouncedReset("Call 1");
  await new Promise((r) => setTimeout(r, 50)); // halfway through delay
  debouncedReset("Call 2"); // should reset timer
  await new Promise((r) => setTimeout(r, 70)); // original timer would have expired here
  assert(
    resetExecutions.length === 0,
    "New call resets previous timer, preventing execution at original expiration",
    `(Executions: ${resetExecutions.length})`,
  );

  await new Promise((r) => setTimeout(r, 50)); // complete second delay
  assert(
    resetExecutions.length === 1 && resetExecutions[0] === "Call 2",
    "Target function executes after reset delay completes",
    `("${resetExecutions[0]}")`,
  );

  // --- TEST 3: Closure Timer State Retention & Manual Cancellation ---
  console.log(
    "\n--- Scenario 3: Closure State Retention & Cancel () Method ---",
  );
  let cancelCalled = false;
  const debouncedCancel = debounce(() => {
    cancelCalled = true;
  }, 100);

  debouncedCancel();
  debouncedCancel.cancel(); // Clears timer stored inside closure
  await new Promise((r) => setTimeout(r, 150));

  assert(
    cancelCalled === false,
    "Closure cancel() method clears timer variable inside closure scope",
    `(cancelCalled: ${cancelCalled})`,
  );

  // --- TEST 4: Stale Response Race Protection ---
  console.log("\n--- Scenario 4: Stale Response Race Protection ---");

  // Simulated state and request tracker
  let activeUIResult = "";
  let currentRequestId = 0;

  async function mockAsyncSearchApi(
    searchTerm: string,
    networkDelayMs: number,
    reqId: number,
  ) {
    await new Promise((r) => setTimeout(r, networkDelayMs));

    // STALE RESPONSE GUARD CHECK: Only update state if this is the latest request
    if (reqId !== currentRequestId) {
      return { search: searchTerm, ignored: true };
    }

    activeUIResult = `Results for ${searchTerm}`;
    return { search: searchTerm, ignored: false };
  }

  // Request A: search "rea", slow network (150ms delay)
  currentRequestId++;
  const reqAId = currentRequestId;
  const promiseA = mockAsyncSearchApi("rea", 150, reqAId);

  // Request B: search "react", fast network (50ms delay)
  currentRequestId++;
  const reqBId = currentRequestId;
  const promiseB = mockAsyncSearchApi("react", 50, reqBId);

  // Wait for both promises to resolve
  const [resA, resB] = await Promise.all([promiseA, promiseB]);

  assert(
    resB.ignored === false && activeUIResult === "Results for react",
    "Newer Request B ('react') completes first and updates UI",
    `("${activeUIResult}")`,
  );

  assert(
    resA.ignored === true,
    "Older Request A ('rea') completes later but is rejected by stale response guard",
    `(resA.ignored: ${resA.ignored})`,
  );

  assert(
    activeUIResult === "Results for react",
    "UI state remains showing Request B results without being overwritten by stale Request A",
    `("${activeUIResult}")`,
  );

  console.log("\n==================================================");
  console.log(`ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log("==================================================\n");
}

runDebounceStaleResponseTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
