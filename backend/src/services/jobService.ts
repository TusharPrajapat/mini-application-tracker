import { Job } from "../models/Job";
import { JobStatus, UserRole } from "../types/commonEnum";
import { CreateJobDTO, UpdateJobDTO } from "../interfaces/jobInterface";

export class JobService {
  /**
   * Create a new Job posting.
   * Only recruiters can create jobs. The recruiter_id MUST come from req.user.userId.
   */
  async createJob(recruiterId: number, data: CreateJobDTO): Promise<Job> {
    if (
      !data.title ||
      typeof data.title !== "string" ||
      data.title.trim() === ""
    ) {
      throw new Error("title is required and must be a non-empty string");
    }
    console.log("data", data);
    if (
      !data.description ||
      typeof data.description !== "string" ||
      data.description.trim() === ""
    ) {
      throw new Error("description is required and must be a non-empty string");
    }

    const validStatuses: number[] = [
      JobStatus.CLOSED,
      JobStatus.DRAFT,
      JobStatus.OPEN,
    ];

    let status = JobStatus.DRAFT;

    if (data.status !== undefined) {
      const numericStatus = Number(data.status);
      if (isNaN(numericStatus) || !validStatuses.includes(numericStatus)) {
        throw new Error(
          `Invalid status value. Allowed status values are CLOSED (${JobStatus.CLOSED}), DRAFT (${JobStatus.DRAFT}), or OPEN (${JobStatus.OPEN})`,
        );
      }
      status = numericStatus as JobStatus;
    }

    const job = await Job.create({
      recruiter_id: recruiterId,
      title: data.title.trim(),
      description: data.description.trim(),
      status,
    });

    return job;
  }

  /**
   * Get list of Jobs based on role:
   * - RECRUITER: Returns jobs created by recruiter (jobs.recruiter_id = user.userId)
   * - CANDIDATE: Returns jobs with status = JobStatus.OPEN
   */
  async getJobs(user: { userId: number; role: UserRole }): Promise<Job[]> {
    if (user.role === UserRole.RECRUITER) {
      return await Job.findAll({
        where: { recruiter_id: user.userId },
        order: [["created_at", "DESC"]],
      });
    }

    if (user.role === UserRole.CANDIDATE) {
      return await Job.findAll({
        where: { status: JobStatus.OPEN },
        order: [["created_at", "DESC"]],
      });
    }

    return [];
  }

  /**
   * Get a Job by ID:
   * - RECRUITER: Can retrieve only if job belongs to that recruiter.
   * - CANDIDATE: Can retrieve only if job status is OPEN.
   */
  async getJobById(
    id: number,
    user: { userId: number; role: UserRole },
  ): Promise<Job> {
    if (isNaN(id) || id <= 0) {
      throw new Error("ID must be a positive integer");
    }

    const job = await Job.findByPk(id);

    if (!job) {
      throw new Error(`Job with id '${id}' not found`);
    }

    if (user.role === UserRole.RECRUITER) {
      if (job.recruiter_id !== user.userId) {
        throw new Error(
          "Forbidden: You do not have permission to access another recruiter's job",
        );
      }
    } else if (user.role === UserRole.CANDIDATE) {
      if (job.status !== JobStatus.OPEN) {
        throw new Error(`Job with id '${id}' not found`);
      }
    }

    return job;
  }

  /**
   * Update a Job posting by ID.
   * Ownership check: Only the recruiter who created the job can update it.
   */
  async updateJob(
    id: number,
    recruiterId: number,
    data: UpdateJobDTO,
  ): Promise<Job> {
    if (isNaN(id) || id <= 0) {
      throw new Error("ID must be a positive integer");
    }

    const job = await Job.findByPk(id);

    if (!job) {
      throw new Error(`Job with id '${id}' not found`);
    }

    if (job.recruiter_id !== recruiterId) {
      throw new Error("Forbidden: You can only update your own jobs");
    }

    if (data.title !== undefined) {
      if (typeof data.title !== "string" || data.title.trim() === "") {
        throw new Error("title must be a non-empty string");
      }
      job.title = data.title.trim();
    }

    if (data.description !== undefined) {
      if (
        typeof data.description !== "string" ||
        data.description.trim() === ""
      ) {
        throw new Error("description must be a non-empty string");
      }
      job.description = data.description.trim();
    }

    if (data.status !== undefined) {
      const validStatuses: number[] = [
        JobStatus.CLOSED,
        JobStatus.DRAFT,
        JobStatus.OPEN,
      ];
      const numericStatus = Number(data.status);
      if (isNaN(numericStatus) || !validStatuses.includes(numericStatus)) {
        throw new Error(
          `Invalid status value. Allowed status values are CLOSED (${JobStatus.CLOSED}), DRAFT (${JobStatus.DRAFT}), or OPEN (${JobStatus.OPEN})`,
        );
      }
      job.status = numericStatus as JobStatus;
    }

    await job.save();
    return job;
  }

  /**
   * Delete a Job posting by ID.
   * Ownership check: Only the recruiter who created the job can delete it.
   */
  async deleteJob(id: number, recruiterId: number): Promise<void> {
    if (isNaN(id) || id <= 0) {
      throw new Error("ID must be a positive integer");
    }

    const job = await Job.findByPk(id);

    if (!job) {
      throw new Error(`Job with id '${id}' not found`);
    }

    if (job.recruiter_id !== recruiterId) {
      throw new Error("Forbidden: You can only delete your own jobs");
    }

    await job.destroy();
  }
}

export const jobService = new JobService();
