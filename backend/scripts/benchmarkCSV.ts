import dotenv from "dotenv";
import path from "path";
import http from "http";
import express from "express";

dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function runBenchmark() {
  const { seedBenchmarkData } = await import("./seedBenchmarkData");
  const { default: sequelize } = await import("../src/config/database");
  const { applicationController } = await import("../src/controllers/applicationController");
  const { UserRole } = await import("../src/types/commonEnum");
  await import("../src/models/Associations");

  console.log("==================================================");
  console.log("PART 3.3 — REAL EVENT-LOOP RESPONSIVENESS BENCHMARK");
  console.log("==================================================\n");

  // Step 1: Ensure 10,000 benchmark applications exist
  const { recruiterId, jobId, applicationCount } = await seedBenchmarkData();
  console.log(`\nStarting benchmark for Job #${jobId} with ${applicationCount} applications...\n`);

  // Step 2: Initialize Express app for benchmark on port 3099
  const app = express();
  app.use(express.json());

  // Inject authenticated benchmark recruiter req.user
  app.use((req, _res, next) => {
    (req as any).user = {
      userId: recruiterId,
      role: UserRole.RECRUITER,
    };
    next();
  });

  // Health endpoint (in-memory, 0 DB queries)
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Job export route
  app.get("/api/jobs/:id/export", (req, res, next) =>
    applicationController.exportApplications(req, res, next)
  );

  const PORT = 3099;
  const server = http.createServer(app);

  await new Promise<void>((resolve) => server.listen(PORT, resolve));
  console.log(`Benchmark server listening on http://localhost:${PORT}\n`);

  // Helper to send a single HTTP GET request and return latency in ms
  function getLatency(urlPath: string): Promise<{ statusCode: number; durationMs: number; bodyLength: number }> {
    return new Promise((resolve, reject) => {
      const start = performance.now();
      http
        .get(`http://localhost:${PORT}${urlPath}`, (res) => {
          let body = "";
          res.on("data", (chunk) => {
            body += chunk;
          });
          res.on("end", () => {
            const end = performance.now();
            resolve({
              statusCode: res.statusCode || 500,
              durationMs: end - start,
              bodyLength: body.length,
            });
          });
        })
        .on("error", reject);
    });
  }

  // Helper to measure health latency during an ongoing export
  async function runExportBenchmark(mode: "naive" | "optimized") {
    const exportPath =
      mode === "naive"
        ? `/api/jobs/${jobId}/export?naive=true`
        : `/api/jobs/${jobId}/export`;

    // 1. Measure Baseline Health Latency (Before Export)
    const baselineLatencies: number[] = [];
    for (let i = 0; i < 20; i++) {
      const { durationMs } = await getLatency("/api/health");
      baselineLatencies.push(durationMs);
      await new Promise((r) => setTimeout(r, 5));
    }

    const avgBaselineLatency =
      baselineLatencies.reduce((a, b) => a + b, 0) / baselineLatencies.length;

    // 2. Launch CSV Export and Monitor Concurrent Health Requests
    const healthLatencies: number[] = [];
    let isExportRunning = true;

    // Launch concurrent health pinger
    const pingerPromise = (async () => {
      while (isExportRunning) {
        try {
          const { durationMs } = await getLatency("/api/health");
          healthLatencies.push(durationMs);
        } catch {
          // ignore transient socket reset
        }
        await new Promise((r) => setTimeout(r, 5));
      }
    })();

    // Launch CSV export request
    const exportStart = performance.now();
    const exportResult = await getLatency(exportPath);
    const exportEnd = performance.now();
    const csvDurationMs = exportEnd - exportStart;

    isExportRunning = false;
    await pingerPromise;

    const avgHealthLatency =
      healthLatencies.length > 0
        ? healthLatencies.reduce((a, b) => a + b, 0) / healthLatencies.length
        : 0;
    const maxHealthLatency =
      healthLatencies.length > 0 ? Math.max(...healthLatencies) : 0;
    const delayedRequests = healthLatencies.filter((l) => l > 30).length;

    return {
      mode,
      statusCode: exportResult.statusCode,
      csvDurationMs,
      bodyLengthBytes: exportResult.bodyLength,
      avgBaselineLatency,
      healthRequestCount: healthLatencies.length,
      avgHealthLatency,
      maxHealthLatency,
      delayedRequests,
    };
  }

  console.log("--- Benchmark Run 1: NAIVE IMPLEMENTATION (Unpaginated Memory Load) ---");
  const naiveResults = await runExportBenchmark("naive");
  console.log(`Completed Naive Export in ${naiveResults.csvDurationMs.toFixed(2)}ms (HTTP Status ${naiveResults.statusCode})`);
  console.log(`  Downloaded: ${naiveResults.bodyLengthBytes} bytes (${(naiveResults.bodyLengthBytes / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`  Health Requests Executed: ${naiveResults.healthRequestCount}`);
  console.log(`  Max Health Latency: ${naiveResults.maxHealthLatency.toFixed(2)}ms\n`);

  // Allow event loop to cool down
  await new Promise((r) => setTimeout(r, 500));

  console.log("--- Benchmark Run 2: OPTIMIZED IMPLEMENTATION (Streaming + DB Pagination) ---");
  const optimizedResults = await runExportBenchmark("optimized");
  console.log(`Completed Optimized Export in ${optimizedResults.csvDurationMs.toFixed(2)}ms (HTTP Status ${optimizedResults.statusCode})`);
  console.log(`  Downloaded: ${optimizedResults.bodyLengthBytes} bytes (${(optimizedResults.bodyLengthBytes / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`  Health Requests Executed: ${optimizedResults.healthRequestCount}`);
  console.log(`  Max Health Latency: ${optimizedResults.maxHealthLatency.toFixed(2)}ms\n`);

  // Print Summary Comparison Table
  console.log("==================================================");
  console.log("BENCHMARK RESULTS COMPARISON SUMMARY");
  console.log("==================================================");
  console.table({
    "Naive (In-Memory String)": {
      "Rows Exported": applicationCount,
      "CSV Export Duration (ms)": Number(naiveResults.csvDurationMs.toFixed(2)),
      "Baseline Health Latency (ms)": Number(naiveResults.avgBaselineLatency.toFixed(2)),
      "Avg Health Latency During Export (ms)": Number(naiveResults.avgHealthLatency.toFixed(2)),
      "Max Health Latency During Export (ms)": Number(naiveResults.maxHealthLatency.toFixed(2)),
      "Delayed Requests (>30ms)": naiveResults.delayedRequests,
      "Downloaded Payload (MB)": Number((naiveResults.bodyLengthBytes / 1024 / 1024).toFixed(2)),
    },
    "Optimized (Streaming + DB Pages)": {
      "Rows Exported": applicationCount,
      "CSV Export Duration (ms)": Number(optimizedResults.csvDurationMs.toFixed(2)),
      "Baseline Health Latency (ms)": Number(optimizedResults.avgBaselineLatency.toFixed(2)),
      "Avg Health Latency During Export (ms)": Number(optimizedResults.avgHealthLatency.toFixed(2)),
      "Max Health Latency During Export (ms)": Number(optimizedResults.maxHealthLatency.toFixed(2)),
      "Delayed Requests (>30ms)": optimizedResults.delayedRequests,
      "Downloaded Payload (MB)": Number((optimizedResults.bodyLengthBytes / 1024 / 1024).toFixed(2)),
    },
  });

  server.close();
  await sequelize.close();

  return { naiveResults, optimizedResults, applicationCount };
}

if (require.main === module) {
  runBenchmark().catch((err) => {
    console.error("Benchmark execution failed:", err);
    process.exit(1);
  });
}

export { runBenchmark };
