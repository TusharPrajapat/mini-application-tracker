import { Op, WhereOptions } from "sequelize";
import sequelize from "../config/database";
import { Application } from "../models/Application";
import { Job } from "../models/Job";
import { Profile } from "../models/Profile";
import { CandidateProfile } from "../models/CandidateProfile";
import { ApplicationStage, JobStatus, UserRole } from "../types/commonEnum";
import {
  CreateApplicationDTO,
  UpdateApplicationStageDTO,
  BulkUpdateApplicationStageDTO,
  BulkStageItemResult,
  BulkUpdateApplicationStageResponse,
  ApplicationListQuery,
} from "../interfaces/applicationInterface";
import { PaginationMeta } from "../interfaces/jobInterface";
import { emailService } from "./emailService";
import { mapWithConcurrency } from "../utils/concurrencyLimiter";
import { escapeCSVField, formatCSVHeaderRow } from "../utils/csvHelper";

export class ApplicationService {
  /**
   * Create a new job application.
   * Only candidates can apply. The candidate_id MUST come from req.user.userId.
   *
   * Race Condition & Duplicate Handling:
   * 1. Checks if candidate has already applied (normal UX check).
   * 2. Catches database UNIQUE(job_id, candidate_id) constraint errors under concurrent inserts
   *    and throws a Conflict error.
   * 3. Triggers non-blocking Fire-and-Forget confirmation email in the background without awaiting its resolution.
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

      // Fetch candidate profile for candidate email and name
      const candidateProfile = await Profile.findByPk(candidateId, {
        include: [
          {
            model: CandidateProfile,
            as: "candidateProfile",
            required: false,
          },
        ],
      });

      const candidateEmail =
        candidateProfile?.email || `candidate_${candidateId}@example.com`;
      const candidateName = candidateProfile?.candidateProfile?.full_name;

      // Non-blocking Fire-and-Forget confirmation email trigger with retry and durable logging.
      // The POST /api/applications request does NOT await this promise!
      void emailService
        .sendConfirmationEmailWithRetry({
          applicationId: application.id,
          candidateEmail,
          candidateName,
          jobTitle: job.title,
        })
        .catch((err) => {
          console.error(
            "[ApplicationService] Defensive error handler caught unhandled email error:",
            err,
          );
        });

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
   * Get list of applications with optional page, limit, search, job_id, stage, and sort filters.
   * Performs database-level pagination using findAndCountAll.
   * - RECRUITER: Returns applications for jobs owned by req.user.userId.
   * - CANDIDATE: Returns applications submitted by req.user.userId.
   */
  async getApplications(
    user: { userId: number; role: UserRole },
    query: ApplicationListQuery = {},
  ): Promise<{ applications: Application[]; pagination: PaginationMeta }> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 12;
    const offset = (page - 1) * limit;

    if (user.role === UserRole.RECRUITER) {
      const recruiterJobs = await Job.findAll({
        where: { recruiter_id: user.userId },
        attributes: ["id"],
      });

      const recruiterJobIds = recruiterJobs.map((j) => j.id);

      if (recruiterJobIds.length === 0) {
        return {
          applications: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        };
      }

      let targetJobIds = recruiterJobIds;

      // Optional job_id filter (enforcing recruiter ownership)
      if (query.job_id !== undefined) {
        if (recruiterJobIds.includes(query.job_id)) {
          targetJobIds = [query.job_id];
        } else {
          // Recruiter does not own the requested job_id -> Return empty result
          return {
            applications: [],
            pagination: { page, limit, total: 0, totalPages: 0 },
          };
        }
      }

      const whereConditions: WhereOptions[] = [
        { job_id: { [Op.in]: targetJobIds } },
      ];

      // Optional stage filter
      if (query.stage !== undefined) {
        whereConditions.push({ stage: query.stage });
      }

      // Optional search filter (matches candidate email OR candidate_profiles full_name)
      if (query.search && query.search.trim() !== "") {
        const searchTerm = `%${query.search.trim()}%`;
        whereConditions.push({
          [Op.or]: [
            { "$candidate.email$": { [Op.iLike]: searchTerm } },
            {
              "$candidate.candidateProfile.full_name$": {
                [Op.iLike]: searchTerm,
              },
            },
          ],
        });
      }

      const sortDirection = query.sort === "oldest" ? "ASC" : "DESC";

      const { count, rows } = await Application.findAndCountAll({
        where: {
          [Op.and]: whereConditions,
        },
        include: [
          { model: Job, as: "job" },
          {
            model: Profile,
            as: "candidate",
            attributes: ["id", "email", "role"],
            include: [
              {
                model: CandidateProfile,
                as: "candidateProfile",
                attributes: [
                  "full_name",
                  "phone",
                  "skills",
                  "experience",
                  "resume_path",
                ],
                required: false,
              },
            ],
          },
        ],
        distinct: true,
        limit,
        offset,
        order: [["created_at", sortDirection]],
      });

      const totalPages = count === 0 ? 0 : Math.ceil(count / limit);

      return {
        applications: rows,
        pagination: {
          page,
          limit,
          total: count,
          totalPages,
        },
      };
    }

    if (user.role === UserRole.CANDIDATE) {
      const sortDirection = query.sort === "oldest" ? "ASC" : "DESC";

      const { count, rows } = await Application.findAndCountAll({
        where: { candidate_id: user.userId },
        include: [{ model: Job, as: "job" }],
        distinct: true,
        limit,
        offset,
        order: [["created_at", sortDirection]],
      });

      const totalPages = count === 0 ? 0 : Math.ceil(count / limit);

      return {
        applications: rows,
        pagination: {
          page,
          limit,
          total: count,
          totalPages,
        },
      };
    }

    return {
      applications: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    };
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
   * Candidate Application Status Timeline:
   * GET /api/applications/:id/timeline
   * Strict candidate ownership check: application.candidate_id === candidateId
   */
  async getApplicationTimeline(
    applicationId: number,
    candidateId: number,
  ): Promise<{
    applicationId: number;
    jobId: number;
    jobTitle: string;
    currentStage: ApplicationStage;
    stages: Array<{
      stage: ApplicationStage;
      label: string;
      completed: boolean;
      current: boolean;
    }>;
  }> {
    if (isNaN(applicationId) || applicationId <= 0) {
      throw new Error("Application ID must be a positive integer");
    }

    const application = await Application.findByPk(applicationId, {
      include: [{ model: Job, as: "job" }],
    });

    if (!application) {
      throw new Error(`Application with id '${applicationId}' not found`);
    }

    if (application.candidate_id !== candidateId) {
      throw new Error(
        "Forbidden: You do not have permission to view another candidate's application timeline",
      );
    }

    const currentStage = application.stage;
    const jobTitle = application.job
      ? application.job.title
      : `Job #${application.job_id}`;

    const stageMap: Record<number, string> = {
      [ApplicationStage.APPLIED]: "APPLIED",
      [ApplicationStage.SCREENING]: "SCREENING",
      [ApplicationStage.INTERVIEW]: "INTERVIEW",
      [ApplicationStage.OFFER]: "OFFER",
      [ApplicationStage.REJECTED]: "REJECTED",
    };

    let pipelineStages: ApplicationStage[];

    if (currentStage === ApplicationStage.REJECTED) {
      pipelineStages = [
        ApplicationStage.APPLIED,
        ApplicationStage.SCREENING,
        ApplicationStage.INTERVIEW,
        ApplicationStage.REJECTED,
      ];
    } else {
      pipelineStages = [
        ApplicationStage.APPLIED,
        ApplicationStage.SCREENING,
        ApplicationStage.INTERVIEW,
        ApplicationStage.OFFER,
      ];
    }

    const stages = pipelineStages.map((stageVal) => {
      const isCurrent = stageVal === currentStage;
      let isCompleted = false;

      if (currentStage === ApplicationStage.REJECTED) {
        // For REJECTED, preceding stages (APPLIED, SCREENING, INTERVIEW) are completed
        isCompleted = stageVal !== ApplicationStage.REJECTED;
      } else {
        // Standard pipeline: stages with numeric value < currentStage are completed
        isCompleted = stageVal < currentStage;
      }

      return {
        stage: stageVal,
        label: stageMap[stageVal] || "UNKNOWN",
        completed: isCompleted,
        current: isCurrent,
      };
    });

    return {
      applicationId: application.id,
      jobId: application.job_id,
      jobTitle,
      currentStage,
      stages,
    };
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

  /**
   * Naive Application Stage Update (Vulnerable to TOCTOU Lost-Update Race Conditions):
   * Used strictly in Part 3.5 test suite to demonstrate the unfixed race condition.
   * Performs an un-isolated read-then-write sequence without optimistic version checking.
   * Optional test hook callbacks (onPostRead, onPreWrite) allow deterministic synchronization in tests.
   */
  async updateApplicationStageNaive(
    id: number,
    recruiterId: number,
    data: { stage: number },
    hooks?: {
      onPostRead?: () => Promise<void> | void;
      onPreWrite?: () => Promise<void> | void;
    },
  ): Promise<Application> {
    if (isNaN(id) || id <= 0) {
      throw new Error("ID must be a positive integer");
    }

    const numericStage = Number(data.stage);
    const validStages = [1, 2, 3, 4, 5];
    if (isNaN(numericStage) || !validStages.includes(numericStage)) {
      throw new Error("Invalid stage value");
    }

    // Step 1: Read application state (Time of Check)
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

    // Optional test hooks for deterministic barrier synchronization
    if (hooks?.onPostRead) {
      await hooks.onPostRead();
    }

    if (hooks?.onPreWrite) {
      await hooks.onPreWrite();
    }

    // Step 2: Unconditional update without version check (Time of Use)
    await Application.update(
      {
        stage: numericStage as ApplicationStage,
        updated_at: new Date(),
      },
      {
        where: { id },
      },
    );

    const updated = await Application.findByPk(id, {
      include: [{ model: Job, as: "job" }],
    });

    return updated!;
  }

  /**
  /**
   * Recruiter Bulk Application Stage Update (Part 3.2 Concurrency Limit):
   * POST /api/jobs/:id/applications/bulk-stage or PUT /api/applications/bulk-stage
   * - Max 50 application IDs allowed per batch request.
   * - Processed with maximum concurrency of 5 using manual worker pool (mapWithConcurrency).
   * - One application failure does NOT abort remaining application updates.
   * - Preserves input order in results array.
   * - Validates stage value and recruiter job ownership per application.
   */
  async bulkUpdateApplicationStage(
    recruiterId: number,
    data: BulkUpdateApplicationStageDTO,
    jobIdParam?: number,
  ): Promise<BulkUpdateApplicationStageResponse> {
    if (isNaN(recruiterId) || recruiterId <= 0) {
      throw new Error("Invalid recruiter ID");
    }

    if (
      !data.applicationIds ||
      !Array.isArray(data.applicationIds) ||
      data.applicationIds.length === 0
    ) {
      throw new Error("applicationIds must be a non-empty array of IDs");
    }

    if (data.applicationIds.length > 50) {
      throw new Error(
        "Cannot update more than 50 applications in a single bulk request",
      );
    }

    // Parse and validate application IDs (coercing numeric strings if needed)
    const parsedIds: number[] = [];
    for (const rawId of data.applicationIds) {
      const num = Number(rawId);
      if (
        rawId === undefined ||
        rawId === null ||
        String(rawId).trim() === "" ||
        isNaN(num) ||
        !Number.isInteger(num) ||
        num <= 0
      ) {
        throw new Error("All application IDs must be positive integers");
      }
      parsedIds.push(num);
    }

    // Check for duplicate IDs in request
    const uniqueIds = new Set(parsedIds);
    if (uniqueIds.size !== parsedIds.length) {
      throw new Error("Duplicate application IDs in request are not allowed");
    }

    // Validate stage value
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

    // Process all application updates with controlled maximum concurrency of 5
    const results = await mapWithConcurrency<number, BulkStageItemResult>(
      parsedIds,
      5,
      async (appId) => {
        try {
          const app = await Application.findByPk(appId, {
            include: [{ model: Job, as: "job" }],
          });

          if (!app) {
            return {
              application_id: appId,
              success: false,
              error: `Application #${appId} could not be found`,
            };
          }

          // Recruiter authorization check: recruiter must own the job
          if (!app.job || app.job.recruiter_id !== recruiterId) {
            return {
              application_id: appId,
              success: false,
              error: `Forbidden: You are not authorized to update application #${appId}`,
            };
          }

          // If jobIdParam was specified in route URL (e.g. POST /jobs/:id/applications/bulk-stage), verify match
          if (
            jobIdParam !== undefined &&
            !isNaN(jobIdParam) &&
            app.job_id !== jobIdParam
          ) {
            return {
              application_id: appId,
              success: false,
              error: `Application #${appId} does not belong to job #${jobIdParam}`,
            };
          }

          app.stage = numericStage as ApplicationStage;
          app.version = app.version + 1;
          app.updated_at = new Date();
          await app.save();

          return {
            application_id: appId,
            success: true,
          };
        } catch (err) {
          const errorMsg =
            err instanceof Error ? err.message : "Failed to update application";
          return {
            application_id: appId,
            success: false,
            error: errorMsg,
          };
        }
      },
    );

    const updatedCount = results.filter((r) => r.success).length;

    return {
      updatedCount,
      results,
    };
  }

  /**
   * Formats a single application record as an RFC 4180 compliant CSV line.
   */
  formatApplicationCSVRow(app: Application): string {
    const stageLabelMap: Record<number, string> = {
      [ApplicationStage.APPLIED]: "Applied",
      [ApplicationStage.SCREENING]: "Screening",
      [ApplicationStage.INTERVIEW]: "Interview",
      [ApplicationStage.OFFER]: "Offer",
      [ApplicationStage.REJECTED]: "Rejected",
    };

    const jobTitle = app.job ? app.job.title : `Job #${app.job_id}`;
    const candidateProfile = app.candidate?.candidateProfile;
    const candidateName = candidateProfile?.full_name || "";
    const candidateEmail = app.candidate?.email || "";
    const phone = candidateProfile?.phone || "";
    const skills = candidateProfile?.skills || "";
    const experience = candidateProfile?.experience || "";
    const stageLabel = stageLabelMap[app.stage] || "Unknown";
    const appliedDate = app.created_at
      ? new Date(app.created_at).toISOString()
      : "";

    const row = [
      escapeCSVField(jobTitle),
      escapeCSVField(candidateName),
      escapeCSVField(candidateEmail),
      escapeCSVField(phone),
      escapeCSVField(skills),
      escapeCSVField(experience),
      escapeCSVField(stageLabel),
      escapeCSVField(appliedDate),
    ];

    return row.join(",") + "\n";
  }

  /**
   * Database-Level Paginated Batch Query for Streaming CSV Export:
   * GET /api/jobs/:id/export or GET /api/applications/export
   * - Enforces recruiter job ownership (jobs.recruiter_id = recruiterId).
   * - Queries database using limit + offset at database level.
   * - Deterministic ordering by application id ASC.
   */
  async exportApplicationsBatch(
    recruiterId: number,
    query: ApplicationListQuery,
    offset: number,
    batchSize: number = 1000,
  ): Promise<{ applications: Application[]; totalCount: number }> {
    if (isNaN(recruiterId) || recruiterId <= 0) {
      throw new Error("Invalid recruiter ID");
    }

    // Fetch jobs owned by recruiter
    const recruiterJobs = await Job.findAll({
      where: { recruiter_id: recruiterId },
      attributes: ["id"],
    });

    const recruiterJobIds = recruiterJobs.map((j) => Number(j.id));
    if (recruiterJobIds.length === 0) {
      return { applications: [], totalCount: 0 };
    }

    let targetJobIds = recruiterJobIds;

    if (query.job_id !== undefined) {
      const numJobId = Number(query.job_id);
      if (recruiterJobIds.includes(numJobId)) {
        targetJobIds = [numJobId];
      } else {
        throw new Error(
          "Forbidden: You do not have permission to export applications for this job",
        );
      }
    }

    const whereConditions: WhereOptions[] = [
      { job_id: { [Op.in]: targetJobIds } },
    ];

    if (query.stage !== undefined) {
      whereConditions.push({ stage: query.stage });
    }

    if (query.search && query.search.trim() !== "") {
      const searchTerm = `%${query.search.trim()}%`;
      whereConditions.push({
        [Op.or]: [
          { "$candidate.email$": { [Op.iLike]: searchTerm } },
          {
            "$candidate.candidateProfile.full_name$": {
              [Op.iLike]: searchTerm,
            },
          },
        ],
      });
    }

    const where = { [Op.and]: whereConditions };

    const { count, rows } = await Application.findAndCountAll({
      where,
      include: [
        { model: Job, as: "job" },
        {
          model: Profile,
          as: "candidate",
          attributes: ["id", "email", "role"],
          include: [
            {
              model: CandidateProfile,
              as: "candidateProfile",
              attributes: [
                "full_name",
                "phone",
                "skills",
                "experience",
                "resume_path",
              ],
              required: false,
            },
          ],
        },
      ],
      order: [["id", "ASC"]],
      offset,
      limit: batchSize,
    });

    return { applications: rows, totalCount: count };
  }

  /**
   * Naive CSV Export Implementation (Used ONLY for controlled benchmark comparison):
   * Loads ALL matching applications into Node.js RAM at once and builds one giant string.
   */
  async exportApplicationsNaive(
    recruiterId: number,
    query: ApplicationListQuery = {},
  ): Promise<string> {
    if (isNaN(recruiterId) || recruiterId <= 0) {
      throw new Error("Invalid recruiter ID");
    }

    const recruiterJobs = await Job.findAll({
      where: { recruiter_id: recruiterId },
      attributes: ["id"],
    });

    const recruiterJobIds = recruiterJobs.map((j) => Number(j.id));

    if (recruiterJobIds.length === 0) {
      return formatCSVHeaderRow();
    }

    let targetJobIds = recruiterJobIds;
    if (query.job_id !== undefined) {
      const numJobId = Number(query.job_id);
      if (recruiterJobIds.includes(numJobId)) {
        targetJobIds = [numJobId];
      } else {
        throw new Error(
          "Forbidden: You do not have permission to export applications for this job",
        );
      }
    }

    const whereConditions: WhereOptions[] = [
      { job_id: { [Op.in]: targetJobIds } },
    ];

    if (query.stage !== undefined) {
      whereConditions.push({ stage: query.stage });
    }

    if (query.search && query.search.trim() !== "") {
      const searchTerm = `%${query.search.trim()}%`;
      whereConditions.push({
        [Op.or]: [
          { "$candidate.email$": { [Op.iLike]: searchTerm } },
          {
            "$candidate.candidateProfile.full_name$": {
              [Op.iLike]: searchTerm,
            },
          },
        ],
      });
    }

    // Fetch ALL matching applications into memory (unpaginated)
    const applications = await Application.findAll({
      where: { [Op.and]: whereConditions },
      include: [
        { model: Job, as: "job" },
        {
          model: Profile,
          as: "candidate",
          attributes: ["id", "email", "role"],
          include: [
            {
              model: CandidateProfile,
              as: "candidateProfile",
              attributes: [
                "full_name",
                "phone",
                "skills",
                "experience",
                "resume_path",
              ],
              required: false,
            },
          ],
        },
      ],
      order: [["id", "ASC"]],
    });

    let csv = formatCSVHeaderRow();
    for (const app of applications) {
      csv += this.formatApplicationCSVRow(app);
    }

    return csv;
  }
}

export const applicationService = new ApplicationService();
