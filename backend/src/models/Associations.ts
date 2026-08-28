import sequelize from "../config/database";
import { Profile } from "./Profile";
import { Job } from "./Job";
import { Application } from "./Application";
import { CandidateProfile } from "./CandidateProfile";

// Define Associations
// 1. Profile -> Jobs (One Recruiter has Many Jobs)
Profile.hasMany(Job, {
  foreignKey: "recruiter_id",
  as: "jobs",
});

Job.belongsTo(Profile, {
  foreignKey: "recruiter_id",
  as: "recruiter",
});

// 2. Profile -> Applications (One Candidate has Many Applications)
Profile.hasMany(Application, {
  foreignKey: "candidate_id",
  as: "applications",
});

Application.belongsTo(Profile, {
  foreignKey: "candidate_id",
  as: "candidate",
});

// 3. Job -> Applications (One Job has Many Applications)
Job.hasMany(Application, {
  foreignKey: "job_id",
  as: "applications",
});

Application.belongsTo(Job, {
  foreignKey: "job_id",
  as: "job",
});

// 4. Profile -> CandidateProfile (1-to-1 relationship between Profile and CandidateProfile)
Profile.hasOne(CandidateProfile, {
  foreignKey: "profile_id",
  as: "candidateProfile",
});

CandidateProfile.belongsTo(Profile, {
  foreignKey: "profile_id",
  as: "profile",
});

// IMPORTANT: Database tables are created & managed by Supabase migrations.
// DO NOT use sequelize.sync() or any table altering calls here.

export { sequelize, Profile, Job, Application, CandidateProfile };
