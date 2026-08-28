import sequelize from '../config/database';
import { Profile } from './Profile';
import { Job } from './Job';
import { Application } from './Application';

// Define Associations
// 1. Profile -> Jobs (One Recruiter has Many Jobs)
Profile.hasMany(Job, {
  foreignKey: 'recruiter_id',
  as: 'jobs',
});

Job.belongsTo(Profile, {
  foreignKey: 'recruiter_id',
  as: 'recruiter',
});

// 2. Profile -> Applications (One Candidate has Many Applications)
Profile.hasMany(Application, {
  foreignKey: 'candidate_id',
  as: 'applications',
});

Application.belongsTo(Profile, {
  foreignKey: 'candidate_id',
  as: 'candidate',
});

// 3. Job -> Applications (One Job has Many Applications)
Job.hasMany(Application, {
  foreignKey: 'job_id',
  as: 'applications',
});

Application.belongsTo(Job, {
  foreignKey: 'job_id',
  as: 'job',
});

// IMPORTANT: Database tables are created & managed by Supabase migrations.
// DO NOT use sequelize.sync() or any table altering calls here.

export { sequelize, Profile, Job, Application };
