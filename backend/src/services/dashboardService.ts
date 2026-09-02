import { Op } from "sequelize";
import { Job } from "../models/Job";
import { Application } from "../models/Application";
import { JobStatus, ApplicationStage } from "../types/commonEnum";
import { RecruiterStats } from "../interfaces/dashboardInterface";

export class DashboardService {
  /**
   * Calculate recruiter dashboard statistics for an authenticated recruiter profile/user ID.
   * Efficiently uses database count queries.
   */
  async getRecruiterStats(recruiterId: number): Promise<RecruiterStats> {
    if (isNaN(recruiterId) || recruiterId <= 0) {
      throw new Error("Invalid recruiter ID");
    }

    // 1. Total Jobs owned by recruiter
    const totalJobs = await Job.count({
      where: { recruiter_id: recruiterId },
    });

    // 2. Open Jobs owned by recruiter (status = JobStatus.OPEN)
    const openJobs = await Job.count({
      where: {
        recruiter_id: recruiterId,
        status: JobStatus.OPEN,
      },
    });

    // Fetch IDs of all recruiter-owned jobs
    const recruiterJobs = await Job.findAll({
      where: { recruiter_id: recruiterId },
      attributes: ["id"],
    });

    const recruiterJobIds = recruiterJobs.map((j) => j.id);

    if (recruiterJobIds.length === 0) {
      return {
        totalJobs,
        openJobs,
        totalApplications: 0,
        interviewApplications: 0,
      };
    }

    // 3. Total Applications belonging to recruiter-owned jobs
    const totalApplications = await Application.count({
      where: {
        job_id: { [Op.in]: recruiterJobIds },
      },
    });

    // 4. Applications in INTERVIEW stage (stage = ApplicationStage.INTERVIEW)
    const interviewApplications = await Application.count({
      where: {
        job_id: { [Op.in]: recruiterJobIds },
        stage: ApplicationStage.INTERVIEW,
      },
    });

    return {
      totalJobs,
      openJobs,
      totalApplications,
      interviewApplications,
    };
  }
}

export const dashboardService = new DashboardService();
