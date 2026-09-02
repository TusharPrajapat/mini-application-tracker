import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function seedBenchmarkData() {
  const { default: sequelize } = await import("../src/config/database");
  const { supabase } = await import("../src/config/supabase");
  const { Profile } = await import("../src/models/Profile");
  const { Job } = await import("../src/models/Job");
  const { CandidateProfile } = await import("../src/models/CandidateProfile");
  const { Application } = await import("../src/models/Application");
  const { UserRole, JobStatus, ApplicationStage } = await import("../src/types/commonEnum");
  await import("../src/models/Associations");

  console.log("==================================================");
  console.log("SEEDING BENCHMARK DATASET (10,000+ APPLICATION ROWS)");
  console.log("==================================================\n");

  await sequelize.authenticate();

  const BENCHMARK_EMAIL = "benchmark_recruiter@example.com";
  const DEFAULT_PASSWORD = "password123";

  // Register benchmark recruiter in Supabase Auth with password123
  async function registerOrGetSupabaseUser(email: string, password: string = DEFAULT_PASSWORD): Promise<string> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (data?.user?.id) {
        return data.user.id;
      }

      if (error) {
        const loginRes = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (loginRes.data?.user?.id) {
          return loginRes.data.user.id;
        }
      }
    } catch {
      // Fallback
    }

    const crypto = await import("crypto");
    return crypto.randomUUID();
  }

  // 1. Find or Create Benchmark Recruiter Profile
  const auth_user_id = await registerOrGetSupabaseUser(BENCHMARK_EMAIL, DEFAULT_PASSWORD);
  let recruiter = await Profile.findOne({ where: { email: BENCHMARK_EMAIL } });

  if (!recruiter) {
    recruiter = await Profile.create({
      auth_user_id,
      email: BENCHMARK_EMAIL,
      role: UserRole.RECRUITER,
    });
    console.log(`Created Benchmark Recruiter Profile ID: ${recruiter.id} (Password: ${DEFAULT_PASSWORD})`);
  } else {
    if (recruiter.auth_user_id !== auth_user_id) {
      recruiter.auth_user_id = auth_user_id;
      await recruiter.save();
    }
    console.log(`Found Existing Benchmark Recruiter Profile ID: ${recruiter.id} (Password: ${DEFAULT_PASSWORD})`);
  }

  // 2. Find or Create Benchmark Job
  let job = await Job.findOne({
    where: { recruiter_id: recruiter.id, title: "Benchmark Job - 10k Applications" },
  });
  if (!job) {
    job = await Job.create({
      recruiter_id: recruiter.id,
      title: "Benchmark Job - 10k Applications",
      description: "Dedicated high-volume benchmark job posting",
      status: JobStatus.OPEN,
    });
    console.log(`Created Benchmark Job ID: ${job.id}`);
  } else {
    if (job.status !== JobStatus.OPEN) {
      job.status = JobStatus.OPEN;
      await job.save();
    }
    console.log(`Found Existing Benchmark Job ID: ${job.id}`);
  }

  // 3. Check existing application count
  const existingCount = await Application.count({ where: { job_id: job.id } });
  console.log(`Current Application Count for Job #${job.id}: ${existingCount}`);

  const TARGET_COUNT = 10000;
  const needed = TARGET_COUNT - existingCount;

  if (needed <= 0) {
    console.log(`✅ Job #${job.id} already has ${existingCount} applications (>= ${TARGET_COUNT}).`);
    return { recruiterId: recruiter.id, jobId: job.id, applicationCount: existingCount };
  }

  console.log(`Seeding ${needed} additional candidate profiles & application records...`);

  const BATCH_SIZE = 1000;
  let seededSoFar = 0;

  while (seededSoFar < needed) {
    const chunkSize = Math.min(BATCH_SIZE, needed - seededSoFar);
    const profilesData = [];
    const candidateProfilesData = [];

    for (let i = 0; i < chunkSize; i++) {
      const idx = existingCount + seededSoFar + i + 1;
      const uuidHex = idx.toString(16).padStart(12, "0");
      profilesData.push({
        auth_user_id: `00000000-0000-0000-0001-${uuidHex}`,
        email: `bench_candidate_${idx}@example.com`,
        role: UserRole.CANDIDATE,
      });
    }

    const createdProfiles = await Profile.bulkCreate(profilesData, { returning: true });

    const appsData = [];
    const stages = [
      ApplicationStage.APPLIED,
      ApplicationStage.SCREENING,
      ApplicationStage.INTERVIEW,
      ApplicationStage.OFFER,
      ApplicationStage.REJECTED,
    ];

    for (let i = 0; i < createdProfiles.length; i++) {
      const prof = createdProfiles[i];
      const idx = existingCount + seededSoFar + i + 1;
      candidateProfilesData.push({
        profile_id: prof.id,
        full_name: `Benchmark Candidate ${idx}`,
        phone: `+1-555-019-${(idx % 900) + 100}`,
        skills: "TypeScript, Node.js, PostgreSQL, Express, React, Docker",
        experience: `${(idx % 10) + 1} years software engineering experience`,
      });

      appsData.push({
        job_id: job.id,
        candidate_id: prof.id,
        stage: stages[idx % stages.length],
        version: 1,
      });
    }

    await CandidateProfile.bulkCreate(candidateProfilesData);
    await Application.bulkCreate(appsData);

    seededSoFar += chunkSize;
    console.log(`  Seeded ${existingCount + seededSoFar} / ${TARGET_COUNT} records...`);
  }

  const finalCount = await Application.count({ where: { job_id: job.id } });
  console.log(`\n✅ Seeding complete! Job #${job.id} now has ${finalCount} applications.`);

  return { recruiterId: recruiter.id, jobId: job.id, applicationCount: finalCount };
}

if (require.main === module) {
  seedBenchmarkData()
    .then(async () => {
      const { default: sequelize } = await import("../src/config/database");
      await sequelize.close();
    })
    .catch((err) => {
      console.error("Benchmark Seeding Failed:", err);
      process.exit(1);
    });
}

export { seedBenchmarkData };
