import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function seedData() {
  const { default: sequelize } = await import("../src/config/database");
  const { supabase } = await import("../src/config/supabase");
  const { Profile } = await import("../src/models/Profile");
  const { Job } = await import("../src/models/Job");
  const { CandidateProfile } = await import("../src/models/CandidateProfile");
  const { Application } = await import("../src/models/Application");
  const { UserRole, JobStatus, ApplicationStage } = await import("../src/types/commonEnum");
  await import("../src/models/Associations");

  console.log("==================================================");
  console.log("NORMAL DEMO DATASET SEEDING (~10 JOBS, ~50 APPLICATIONS)");
  console.log("==================================================\n");

  const DEFAULT_PASSWORD = "password123";

  // Helper function to register or authenticate a user in Supabase Auth with password123
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

  try {
    await sequelize.authenticate();
    console.log("Database connection authenticated successfully.");

    // 1. Create or Reuse 2 Recruiter Accounts in Supabase Auth & PostgreSQL
    const recruiterEmails = [
      "demo_recruiter_1@example.com",
      "demo_recruiter_2@example.com",
    ];

    const recruiters = [];
    for (const email of recruiterEmails) {
      const auth_user_id = await registerOrGetSupabaseUser(email, DEFAULT_PASSWORD);
      let recruiter = await Profile.findOne({ where: { email } });

      if (!recruiter) {
        recruiter = await Profile.create({
          auth_user_id,
          email,
          role: UserRole.RECRUITER,
        });
        console.log(`Created Recruiter Profile: ${recruiter.email} (ID: ${recruiter.id}, Password: ${DEFAULT_PASSWORD})`);
      } else {
        if (recruiter.auth_user_id !== auth_user_id) {
          recruiter.auth_user_id = auth_user_id;
          await recruiter.save();
        }
        console.log(`Reused Recruiter Profile: ${recruiter.email} (ID: ${recruiter.id}, Password: ${DEFAULT_PASSWORD})`);
      }
      recruiters.push(recruiter);
    }

    // 2. Create or Reuse 20 Candidate Accounts & CandidateProfiles in Supabase Auth & PostgreSQL
    const candidates = [];
    for (let i = 1; i <= 20; i++) {
      const email = `demo_candidate_${i}@example.com`;
      const auth_user_id = await registerOrGetSupabaseUser(email, DEFAULT_PASSWORD);

      let candidateProfileObj = await Profile.findOne({ where: { email } });
      if (!candidateProfileObj) {
        candidateProfileObj = await Profile.create({
          auth_user_id,
          email,
          role: UserRole.CANDIDATE,
        });

        await CandidateProfile.create({
          profile_id: candidateProfileObj.id,
          full_name: `Candidate ${i}`,
          phone: `+1-555-010-${(100 + i).toString().padStart(3, "0")}`,
          skills: i % 2 === 0 ? "TypeScript, React, Node.js, PostgreSQL" : "Python, AWS, Docker, Kubernetes",
          experience: `${(i % 5) + 1} years of experience in software development`,
        });
        console.log(`Created Candidate Profile: ${email} (ID: ${candidateProfileObj.id}, Password: ${DEFAULT_PASSWORD})`);
      } else {
        if (candidateProfileObj.auth_user_id !== auth_user_id) {
          candidateProfileObj.auth_user_id = auth_user_id;
          await candidateProfileObj.save();
        }
        console.log(`Reused Candidate Profile: ${email} (ID: ${candidateProfileObj.id}, Password: ${DEFAULT_PASSWORD})`);
      }
      candidates.push(candidateProfileObj);
    }

    // 3. Create or Reuse 10 Job Postings (All OPEN by default)
    const jobDefinitions = [
      { title: "Senior Full Stack Engineer", description: "Building scalable React & Node.js web applications.", status: JobStatus.OPEN, recruiterIndex: 0 },
      { title: "Frontend React Specialist", description: "Crafting beautiful, responsive UI components in TypeScript.", status: JobStatus.OPEN, recruiterIndex: 0 },
      { title: "Backend Node.js Architect", description: "Designing high-throughput microservices and API gateways.", status: JobStatus.OPEN, recruiterIndex: 0 },
      { title: "DevOps & Cloud Engineer", description: "Managing CI/CD pipelines, Docker containers, and AWS infrastructure.", status: JobStatus.OPEN, recruiterIndex: 0 },
      { title: "Product Designer (UI/UX)", description: "Creating intuitive user workflows and modern design systems.", status: JobStatus.OPEN, recruiterIndex: 0 },
      { title: "Technical Lead - Data Platform", description: "Leading data pipeline engineering and streaming analytics.", status: JobStatus.OPEN, recruiterIndex: 1 },
      { title: "QA Automation Engineer", description: "Writing E2E automation test suites using Playwright and Jest.", status: JobStatus.OPEN, recruiterIndex: 1 },
      { title: "Mobile Developer (React Native)", description: "Building cross-platform mobile apps for iOS and Android.", status: JobStatus.OPEN, recruiterIndex: 1 },
      { title: "AI/ML Infrastructure Engineer", description: "Optimizing GPU clusters and LLM inference pipelines.", status: JobStatus.OPEN, recruiterIndex: 1 },
      { title: "Security Operations Manager", description: "Overseeing SOC compliance, penetration testing, and security audits.", status: JobStatus.OPEN, recruiterIndex: 1 },
    ];

    const jobs = [];
    for (const jDef of jobDefinitions) {
      const rec = recruiters[jDef.recruiterIndex];
      let job = await Job.findOne({
        where: { recruiter_id: rec.id, title: jDef.title },
      });

      if (!job) {
        job = await Job.create({
          recruiter_id: rec.id,
          title: jDef.title,
          description: jDef.description,
          status: JobStatus.OPEN,
        });
        console.log(`Created Job: "${job.title}" (Status: OPEN, ID: ${job.id})`);
      } else {
        if (job.status !== JobStatus.OPEN) {
          job.status = JobStatus.OPEN;
          await job.save();
          console.log(`Updated Job to OPEN: "${job.title}" (ID: ${job.id})`);
        } else {
          console.log(`Reused Job: "${job.title}" (Status: OPEN, ID: ${job.id})`);
        }
      }
      jobs.push(job);
    }

    // 4. Create or Reuse ~50 Applications Across Jobs
    const stages = [
      ApplicationStage.APPLIED,
      ApplicationStage.SCREENING,
      ApplicationStage.INTERVIEW,
      ApplicationStage.OFFER,
      ApplicationStage.REJECTED,
    ];

    let createdAppCount = 0;
    let reusedAppCount = 0;

    // Distribute 50 applications deterministically across 10 jobs and 20 candidates
    for (let jIdx = 0; jIdx < jobs.length; jIdx++) {
      const job = jobs[jIdx];
      // Each job gets 5 applications (10 jobs * 5 apps = 50 total applications)
      for (let k = 0; k < 5; k++) {
        // Select candidate index deterministically ensuring distinct candidates per job
        const candidateIndex = (jIdx * 2 + k) % candidates.length;
        const candidate = candidates[candidateIndex];
        const stage = stages[(jIdx + k) % stages.length];

        let app = await Application.findOne({
          where: { job_id: job.id, candidate_id: candidate.id },
        });

        if (!app) {
          app = await Application.create({
            job_id: job.id,
            candidate_id: candidate.id,
            stage,
            version: 1,
          });
          createdAppCount++;
        } else {
          reusedAppCount++;
        }
      }
    }

    const totalJobs = await Job.count();
    const totalApps = await Application.count();

    console.log("\n==================================================");
    console.log(`SEED SUMMARY:`);
    console.log(`- Recruiter Profiles: ${recruiters.length} (Default Password: ${DEFAULT_PASSWORD})`);
    console.log(`- Candidate Profiles: ${candidates.length} (Default Password: ${DEFAULT_PASSWORD})`);
    console.log(`- Total Jobs in DB: ${totalJobs} (${jobs.length} seeded/reused)`);
    console.log(`- Total Applications in DB: ${totalApps} (${createdAppCount} created, ${reusedAppCount} reused in this run)`);
    console.log("✅ Normal dataset seed completed successfully!");
    console.log("==================================================\n");

  } catch (error) {
    console.error("❌ Seeding Failed:", error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seedData();

export { seedData };
