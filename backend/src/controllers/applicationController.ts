import { Request, Response, NextFunction } from "express";
import { applicationService } from "../services/applicationService";
import { candidateProfileService } from "../services/candidateProfileService";
import { resumeService } from "../services/resumeService";
import { ApplicationListQuery } from "../interfaces/applicationInterface";
import { ApplicationStage } from "../types/commonEnum";
import { formatCSVHeaderRow } from "../utils/csvHelper";

export class ApplicationController {
  /**
   * HTTP Handler for POST /api/applications
   * Only CANDIDATE role permitted (enforced by requireRole middleware).
   */
  async createApplication(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: "Unauthenticated" });
        return;
      }

      const { job_id, resume_path } = req.body;

      const application = await applicationService.createApplication(
        req.user.userId,
        {
          job_id,
          resume_path,
        }
      );

      res.status(201).json({
        success: true,
        message: "Application submitted successfully",
        data: application,
      });
    } catch (error) {
      const err = error as Error;

      if (err.message.includes("Conflict")) {
        res.status(409).json({ success: false, error: err.message });
        return;
      }

      if (
        err.message.includes("required") ||
        err.message.includes("Invalid") ||
        err.message.includes("Cannot apply")
      ) {
        res.status(400).json({ success: false, error: err.message });
        return;
      }

      if (err.message.includes("not found")) {
        res.status(404).json({ success: false, error: err.message });
        return;
      }

      res
        .status(500)
        .json({ success: false, error: err.message || "Internal server error" });
    }
  }

  /**
   * HTTP Handler for GET /api/applications
   * Supports optional query filters: page, limit, search, job_id, stage, sort.
   * Returns recruiter's job applications (RECRUITER) or candidate's own applications (CANDIDATE) with pagination metadata.
   */
  async getApplications(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: "Unauthenticated" });
        return;
      }

      const query: ApplicationListQuery = {};

      // Parse & validate page
      if (req.query.page !== undefined && req.query.page !== "") {
        const rawPage = String(req.query.page).trim();
        const pageNum = Number(rawPage);
        if (!/^\d+$/.test(rawPage) || isNaN(pageNum) || pageNum <= 0) {
          res.status(400).json({
            success: false,
            error: "Invalid page: Must be a positive integer",
          });
          return;
        }
        query.page = pageNum;
      }

      // Parse & validate limit
      if (req.query.limit !== undefined && req.query.limit !== "") {
        const rawLimit = String(req.query.limit).trim();
        const limitNum = Number(rawLimit);
        if (
          !/^\d+$/.test(rawLimit) ||
          isNaN(limitNum) ||
          limitNum <= 0 ||
          limitNum > 100
        ) {
          res.status(400).json({
            success: false,
            error: "Invalid limit: Must be a positive integer up to 100",
          });
          return;
        }
        query.limit = limitNum;
      }

      // Parse & validate search
      if (typeof req.query.search === "string" && req.query.search.trim() !== "") {
        query.search = req.query.search.trim();
      }

      // Parse & validate job_id
      if (req.query.job_id !== undefined && req.query.job_id !== "") {
        const jobIdNum = Number(req.query.job_id);
        if (isNaN(jobIdNum) || jobIdNum <= 0) {
          res.status(400).json({
            success: false,
            error: "Invalid job_id: Must be a positive integer",
          });
          return;
        }
        query.job_id = jobIdNum;
      }

      // Parse & validate stage
      if (req.query.stage !== undefined && req.query.stage !== "") {
        const stageNum = Number(req.query.stage);
        const validStages = [1, 2, 3, 4, 5];
        if (isNaN(stageNum) || !validStages.includes(stageNum)) {
          res.status(400).json({
            success: false,
            error:
              "Invalid stage value: Allowed stage values are 1 (APPLIED), 2 (SCREENING), 3 (INTERVIEW), 4 (OFFER), or 5 (REJECTED)",
          });
          return;
        }
        query.stage = stageNum as ApplicationStage;
      }

      // Parse & validate sort
      if (req.query.sort !== undefined && req.query.sort !== "") {
        const sortStr = String(req.query.sort).toLowerCase();
        if (sortStr !== "newest" && sortStr !== "oldest") {
          res.status(400).json({
            success: false,
            error: "Invalid sort option: Must be 'newest' or 'oldest'",
          });
          return;
        }
        query.sort = sortStr as "newest" | "oldest";
      }

      const result = await applicationService.getApplications(
        req.user,
        query
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      const err = error as Error;

      if (
        err.message.includes("Invalid") ||
        err.message.includes("positive integer")
      ) {
        res.status(400).json({ success: false, error: err.message });
        return;
      }

      res
        .status(500)
        .json({ success: false, error: err.message || "Internal server error" });
    }
  }

  /**
   * HTTP Handler for GET /api/jobs/:id/export and GET /api/applications/export
   * Only RECRUITER role permitted.
   * Streams job applications as CSV using database-level batch pagination (1,000 rows/batch)
   * and handles stream drain backpressure.
   * If ?naive=true parameter is present, runs naive baseline memory load (for benchmarking).
   */
  async exportApplications(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: "Unauthenticated" });
        return;
      }

      // Reject page or limit query parameters if supplied
      if (req.query.page !== undefined || req.query.limit !== undefined) {
        res.status(400).json({
          success: false,
          error: "page and limit parameters are not allowed for CSV export",
        });
        return;
      }

      const query: ApplicationListQuery = {};

      // If job ID specified in route params (GET /api/jobs/:id/export)
      if (req.params.id !== undefined && req.params.id !== "") {
        const jobIdParam = Number(req.params.id);
        if (isNaN(jobIdParam) || jobIdParam <= 0) {
          res.status(400).json({
            success: false,
            error: "Invalid job ID: Must be a positive integer",
          });
          return;
        }
        query.job_id = jobIdParam;
      }

      // Parse & validate search
      if (typeof req.query.search === "string" && req.query.search.trim() !== "") {
        query.search = req.query.search.trim();
      }

      // Parse & validate query job_id (if not already set by route param)
      if (
        query.job_id === undefined &&
        req.query.job_id !== undefined &&
        req.query.job_id !== ""
      ) {
        const jobIdNum = Number(req.query.job_id);
        if (isNaN(jobIdNum) || jobIdNum <= 0) {
          res.status(400).json({
            success: false,
            error: "Invalid job_id: Must be a positive integer",
          });
          return;
        }
        query.job_id = jobIdNum;
      }

      // Parse & validate stage
      if (req.query.stage !== undefined && req.query.stage !== "") {
        const stageNum = Number(req.query.stage);
        const validStages = [1, 2, 3, 4, 5];
        if (isNaN(stageNum) || !validStages.includes(stageNum)) {
          res.status(400).json({
            success: false,
            error:
              "Invalid stage value: Allowed stage values are 1 (APPLIED), 2 (SCREENING), 3 (INTERVIEW), 4 (OFFER), or 5 (REJECTED)",
          });
          return;
        }
        query.stage = stageNum as ApplicationStage;
      }

      // Check if naive baseline execution is explicitly requested (for benchmark)
      const isNaiveMode = req.query.naive === "true" || req.query.naive === "1";

      if (isNaiveMode) {
        const naiveCsvData = await applicationService.exportApplicationsNaive(
          req.user.userId,
          query
        );
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader(
          "Content-Disposition",
          'attachment; filename="applications.csv"'
        );
        res.status(200).send(naiveCsvData);
        return;
      }

      // Production Streaming Path: Set headers
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="applications.csv"'
      );
      res.status(200);

      // Write CSV Header Row
      const canContinue = res.write(formatCSVHeaderRow());
      if (!canContinue) {
        await new Promise<void>((resolve) => res.once("drain", resolve));
      }

      // Database-level batch pagination (1,000 rows per batch)
      const BATCH_SIZE = 1000;
      let offset = 0;

      while (true) {
        const { applications, totalCount } =
          await applicationService.exportApplicationsBatch(
            req.user.userId,
            query,
            offset,
            BATCH_SIZE
          );

        if (applications.length === 0) {
          break;
        }

        for (const app of applications) {
          const rowStr = applicationService.formatApplicationCSVRow(app);
          const ok = res.write(rowStr);
          if (!ok) {
            // Handle stream backpressure when socket buffer fills
            await new Promise<void>((resolve) => res.once("drain", resolve));
          }
        }

        offset += applications.length;

        if (offset >= totalCount || applications.length < BATCH_SIZE) {
          break;
        }
      }

      res.end();
    } catch (error) {
      const err = error as Error;
      console.error("CSV Export Error:", err);

      if (res.headersSent) {
        // Headers already sent (during streaming), end the stream cleanly
        res.end();
        return;
      }

      if (err.message.includes("Forbidden")) {
        res.status(403).json({ success: false, error: err.message });
        return;
      }

      if (
        err.message.includes("Invalid") ||
        err.message.includes("positive integer")
      ) {
        res.status(400).json({ success: false, error: err.message });
        return;
      }

      res
        .status(500)
        .json({ success: false, error: "Failed to export applications" });
    }
  }

  /**
   * HTTP Handler for GET /api/applications/:id
   */
  async getApplicationById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: "Unauthenticated" });
        return;
      }

      const id = Number(req.params.id);

      const application = await applicationService.getApplicationById(
        id,
        req.user
      );

      res.status(200).json({
        success: true,
        data: application,
      });
    } catch (error) {
      const err = error as Error;

      if (err.message.includes("Forbidden")) {
        res.status(403).json({ success: false, error: err.message });
        return;
      }

      if (err.message.includes("not found")) {
        res.status(404).json({ success: false, error: err.message });
        return;
      }

      if (err.message.includes("positive integer")) {
        res.status(400).json({ success: false, error: err.message });
        return;
      }

      res
        .status(500)
        .json({ success: false, error: err.message || "Internal server error" });
    }
  }

  /**
   * HTTP Handler for GET /api/applications/:id/timeline
   * Only CANDIDATE role permitted. Returns hiring stage timeline for candidate's application.
   */
  async getApplicationTimeline(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: "Unauthenticated" });
        return;
      }

      const id = Number(req.params.id);

      const timeline = await applicationService.getApplicationTimeline(
        id,
        req.user.userId
      );

      res.status(200).json({
        success: true,
        data: timeline,
      });
    } catch (error) {
      const err = error as Error;

      if (err.message.includes("Forbidden")) {
        res.status(403).json({ success: false, error: err.message });
        return;
      }

      if (err.message.includes("not found")) {
        res.status(404).json({ success: false, error: err.message });
        return;
      }

      if (err.message.includes("positive integer")) {
        res.status(400).json({ success: false, error: err.message });
        return;
      }

      res
        .status(500)
        .json({ success: false, error: err.message || "Internal server error" });
    }
  }

  /**
   * HTTP Handler for POST /api/jobs/:id/applications/bulk-stage and PUT /api/applications/bulk-stage
   * Only RECRUITER role permitted. Updates stage for multiple applications using controlled concurrency limiter.
   */
  async bulkUpdateApplicationStage(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: "Unauthenticated" });
        return;
      }

      const rawAppIds = req.body.applicationIds ?? req.body.application_ids;
      const rawStage = req.body.stage ?? req.body.target_stage;

      const jobIdParam = req.params.id ? Number(req.params.id) : undefined;
      if (
        req.params.id !== undefined &&
        (isNaN(jobIdParam!) || jobIdParam! <= 0)
      ) {
        res.status(400).json({
          success: false,
          error: "Invalid job ID: Must be a positive integer",
        });
        return;
      }

      const result = await applicationService.bulkUpdateApplicationStage(
        req.user.userId,
        {
          applicationIds: rawAppIds,
          stage: rawStage,
        },
        jobIdParam
      );

      res.status(200).json({
        success: true,
        message: "Applications bulk stage update completed",
        updatedCount: result.updatedCount,
        results: result.results,
      });
    } catch (error) {
      const err = error as Error;

      if (
        err.message.includes("positive integer") ||
        err.message.includes("Invalid") ||
        err.message.includes("array") ||
        err.message.includes("Duplicate") ||
        err.message.includes("50") ||
        err.message.includes("100")
      ) {
        res.status(400).json({
          success: false,
          error: err.message || "Invalid bulk stage update request",
        });
        return;
      }

      if (err.message.includes("Forbidden") || err.message.includes("authorized")) {
        res.status(403).json({
          success: false,
          error: err.message || "Forbidden: Unauthorized access",
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: "Failed to update applications",
      });
    }
  }

  /**
   * HTTP Handler for PUT /api/applications/:id/stage
   * Only RECRUITER role permitted. Updates stage with optimistic concurrency version check.
   */
  async updateApplicationStage(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: "Unauthenticated" });
        return;
      }

      const id = Number(req.params.id);
      const { stage, version } = req.body;

      const updatedApplication =
        await applicationService.updateApplicationStage(id, req.user.userId, {
          stage,
          version,
        });

      res.status(200).json({
        success: true,
        message: "Application stage updated successfully",
        data: updatedApplication,
      });
    } catch (error) {
      const err = error as Error;

      if (err.message.includes("Conflict")) {
        res.status(409).json({ success: false, error: err.message });
        return;
      }

      if (err.message.includes("Forbidden")) {
        res.status(403).json({ success: false, error: err.message });
        return;
      }

      if (err.message.includes("not found")) {
        res.status(404).json({ success: false, error: err.message });
        return;
      }

      if (
        err.message.includes("positive integer") ||
        err.message.includes("Invalid") ||
        err.message.includes("required")
      ) {
        res.status(400).json({ success: false, error: err.message });
        return;
      }

      res
        .status(500)
        .json({ success: false, error: err.message || "Internal server error" });
    }
  }

  /**
   * HTTP Handler for GET /api/applications/:id/candidate-profile
   * Only RECRUITER role permitted. Retrieves candidate profile for an owned application.
   */
  async getCandidateProfileForApplication(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: "Unauthenticated" });
        return;
      }

      const id = Number(req.params.id);

      const result =
        await candidateProfileService.getCandidateProfileForApplication(
          id,
          req.user.userId
        );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      const err = error as Error;

      if (err.message.includes("Forbidden")) {
        res.status(403).json({ success: false, error: err.message });
        return;
      }

      if (err.message.includes("not found")) {
        res.status(404).json({ success: false, error: err.message });
        return;
      }

      if (err.message.includes("positive integer") || err.message.includes("Invalid")) {
        res.status(400).json({ success: false, error: err.message });
        return;
      }

      res
        .status(500)
        .json({ success: false, error: err.message || "Internal server error" });
    }
  }

  /**
   * HTTP Handler for GET /api/applications/:id/candidate-resume
   * Only RECRUITER role permitted. Retrieves 60-second short-lived signed resume URL for an owned application.
   */
  async getCandidateResumeForApplication(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: "Unauthenticated" });
        return;
      }

      const id = Number(req.params.id);
      const accessToken = req.headers.authorization?.split(" ")[1];

      const result = await resumeService.getResumeForApplication(
        id,
        req.user.userId,
        accessToken
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      const err = error as Error;

      if (err.message.includes("Forbidden")) {
        res.status(403).json({ success: false, error: err.message });
        return;
      }

      if (err.message.includes("not found") || err.message.includes("No resume")) {
        res.status(404).json({ success: false, error: err.message });
        return;
      }

      if (err.message.includes("positive integer") || err.message.includes("Invalid")) {
        res.status(400).json({ success: false, error: err.message });
        return;
      }

      res
        .status(500)
        .json({ success: false, error: err.message || "Internal server error" });
    }
  }
}

export const applicationController = new ApplicationController();
