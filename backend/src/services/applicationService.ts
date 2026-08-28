import { Op } from "sequelize";
import { Application } from "../models/Application";
import { Job } from "../models/Job";
import { Profile } from "../models/Profile";
import { ApplicationStage, JobStatus, UserRole } from "../types/commonEnum";
import {
  CreateApplicationDTO,
  UpdateApplicationStageDTO,
} from "../interfaces/applicationInterface";

export class ApplicationService {
  /**
   * Create a new job application.
   * Only candidates can apply. The candidate_id MUST come from req.user.userId.
   *
   * Race Condition & Duplicate Handling:
   * 1. Checks if candidate has already applied (normal UX check).
   * 2. Catches database UNIQUE(job_id, candidate_id) constraint errors under concurrent inserts
   *    and throws a Conflict error.
   */
  async createApplication(
    candidateId: number,
    data: CreateApplicationDTO,
  ): Promise<Application> {
    const jobId = Number(data.job_id);

    if (data.job_id === undefined || isNaN(jobId) || jobId <= 0) {
      throw new Error("job_id is required and must be a positive integer");
    }

    // 1. Verify that requested job exists
    const job = await Job.findByPk(jobId);

    if (!job) {
      throw new Error(`Job with id '${jobId}' not found`);
    }

    // 2. Candidate can apply only when job.status === JobStatus.OPEN
    if (job.status !== JobStatus.OPEN) {
      throw new Error("Cannot apply to a job that is not OPEN");
    }

    // 3. Service-level check for duplicate application (normal flow)
    const existingApplication = await Application.findOne({
      where: {
        job_id: jobId,
        candidate_id: candidateId,
      },
    });

    if (existingApplication) {
      throw new Error("You have already applied for this job");
    }

    // 4. Create application & catch database unique constraint violation under concurrency
    try {
      const application = await Application.create({
        job_id: jobId,
        candidate_id: candidateId,
        resume_path: data.resume_path ? data.resume_path.trim() : null,
        stage: ApplicationStage.APPLIED,
        version: 1,
      });

      if (!application) {
        throw new Error("Failed to create application");
      }

      if (application.resume_path) {
        const file_name = application.resume_path.split("/").pop();
        if (!file_name) {
          throw new Error("Failed to extract filename from resume path");
        }
      }

      return application;
    } catch (err: unknown) {
      const error = err as Error;
      if (
        error.name === "SequelizeUniqueConstraintError" ||
        error.message.includes("unique constraint") ||
        error.message.includes("uq_applications_job_candidate")
      ) {
        throw new Error("Conflict: Candidate has already applied for this job");
      }
      throw error;
    }
  }

  /**
   * Get list of applications based on user role:
   * - RECRUITER: Returns applications for jobs owned by req.user.userId.
   * - CANDIDATE: Returns applications submitted by req.user.userId.
   */
  async getApplications(user: {
    userId: number;
    role: UserRole;
  }): Promise<Application[]> {
    if (user.role === UserRole.RECRUITER) {
      const recruiterJobs = await Job.findAll({
        where: { recruiter_id: user.userId },
        attributes: ["id"],
      });

      const jobIds = recruiterJobs.map((j) => j.id);

      if (jobIds.length === 0) {
        return [];
      }

      return await Application.findAll({
        where: { job_id: { [Op.in]: jobIds } },
        include: [
          { model: Job, as: "job" },
          {
            model: Profile,
            as: "candidate",
            attributes: ["id", "email", "role"],
          },
        ],
        order: [["created_at", "DESC"]],
      });
    }

    if (user.role === UserRole.CANDIDATE) {
      return await Application.findAll({
        where: { candidate_id: user.userId },
        include: [{ model: Job, as: "job" }],
        order: [["created_at", "DESC"]],
      });
    }

    return [];
  }

  /**
   * Get an Application by ID:
   * - RECRUITER: Can retrieve application if its job belongs to req.user.userId.
   * - CANDIDATE: Can retrieve application if candidate_id === req.user.userId.
   */
  async getApplicationById(
    id: number,
    user: { userId: number; role: UserRole },
  ): Promise<Application> {
    if (isNaN(id) || id <= 0) {
      throw new Error("ID must be a positive integer");
    }

    const application = await Application.findByPk(id, {
      include: [
        { model: Job, as: "job" },
        {
          model: Profile,
          as: "candidate",
          attributes: ["id", "email", "role"],
        },
      ],
    });

    if (!application) {
      throw new Error(`Application with id '${id}' not found`);
    }

    if (user.role === UserRole.RECRUITER) {
      if (!application.job || application.job.recruiter_id !== user.userId) {
        throw new Error(
          "Forbidden: You do not have permission to view applications for jobs you do not own",
        );
      }
    } else if (user.role === UserRole.CANDIDATE) {
      if (application.candidate_id !== user.userId) {
        throw new Error(`Application with id '${id}' not found`);
      }
    }

    return application;
  }

  /**
   * Update Application Stage with Optimistic Concurrency Control.
   * - Only RECRUITER can update stage.
   * - Recruiter must own the job associated with the application.
   * - Stage must be validated against ApplicationStage enum.
   * - Version check guarantees atomic update: application.version must match expected version.
   * - Increments version by 1 upon success.
   */
  async updateApplicationStage(
    id: number,
    recruiterId: number,
    data: UpdateApplicationStageDTO,
  ): Promise<Application> {
    if (isNaN(id) || id <= 0) {
      throw new Error("ID must be a positive integer");
    }

    const validStages: number[] = [
      ApplicationStage.APPLIED,
      ApplicationStage.SCREENING,
      ApplicationStage.INTERVIEW,
      ApplicationStage.OFFER,
      ApplicationStage.REJECTED,
    ];

    const numericStage = Number(data.stage);
    if (
      data.stage === undefined ||
      isNaN(numericStage) ||
      !validStages.includes(numericStage)
    ) {
      throw new Error(
        `Invalid stage value. Allowed stage values are APPLIED (${ApplicationStage.APPLIED}), SCREENING (${ApplicationStage.SCREENING}), INTERVIEW (${ApplicationStage.INTERVIEW}), OFFER (${ApplicationStage.OFFER}), or REJECTED (${ApplicationStage.REJECTED})`,
      );
    }

    const expectedVersion = Number(data.version);
    if (
      data.version === undefined ||
      isNaN(expectedVersion) ||
      expectedVersion < 1
    ) {
      throw new Error("version is required and must be a positive integer");
    }

    // Fetch application to verify existence & recruiter ownership
    const application = await Application.findByPk(id, {
      include: [{ model: Job, as: "job" }],
    });

    if (!application) {
      throw new Error(`Application with id '${id}' not found`);
    }

    if (!application.job || application.job.recruiter_id !== recruiterId) {
      throw new Error(
        "Forbidden: You can only update applications for jobs you own",
      );
    }

    // Atomic optimistic concurrency update using WHERE id = :id AND version = :expectedVersion
    const [affectedCount] = await Application.update(
      {
        stage: numericStage as ApplicationStage,
        version: expectedVersion + 1,
        updated_at: new Date(),
      },
      {
        where: {
          id,
          version: expectedVersion,
        },
      },
    );

    if (affectedCount === 0) {
      throw new Error(
        "Conflict: Application was modified by another request (version mismatch)",
      );
    }

    // Retrieve updated application
    const updatedApplication = await Application.findByPk(id, {
      include: [
        { model: Job, as: "job" },
        {
          model: Profile,
          as: "candidate",
          attributes: ["id", "email", "role"],
        },
      ],
    });

    return updatedApplication!;
  }
}

export const applicationService = new ApplicationService();
