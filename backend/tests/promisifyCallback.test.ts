import { promisifyCallback } from "../src/utils/promisifyCallback";
import fs from "fs";
import path from "path";

async function runPromisifyCallbackTests() {
  console.log("==================================================");
  console.log("RUNNING PART 3.1 — PROMISIFY CALLBACK AUTOMATED TESTS");
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

  // Test 1: Wrap Node.js legacy fs.readFile error-first callback
  const packageJsonPath = path.join(__dirname, "../package.json");
  const fileContent = await promisifyCallback<Buffer>((cb) => {
    fs.readFile(packageJsonPath, cb);
  });

  assert(
    Buffer.isBuffer(fileContent) && fileContent.toString().includes("applicant-tracker-backend"),
    "Successfully wraps legacy Node.js fs.readFile error-first callback into an awaitable Promise",
    `(Read ${fileContent.length} bytes)`
  );

  // Test 2: Verify error rejection on legacy callback error
  let caughtError: string | null = null;
  try {
    await promisifyCallback<string>((cb) => {
      // Simulate legacy callback error
      setTimeout(() => cb(new Error("Legacy callback operation failed")), 10);
    });
  } catch (err: any) {
    caughtError = err.message;
  }

  assert(
    caughtError === "Legacy callback operation failed",
    "Rejects Promise when legacy error-first callback returns an error",
    `("${caughtError}")`
  );

  console.log("\n==================================================");
  console.log(`ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log("==================================================\n");
}

runPromisifyCallbackTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
