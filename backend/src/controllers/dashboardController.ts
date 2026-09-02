import { Request, Response, NextFunction } from "express";
import { dashboardService } from "../services/dashboardService";

export class DashboardController {
  /**
   * HTTP Handler for GET /api/dashboard/recruiter/stats
   * Requires authenticated RECRUITER role. Calculates metrics for authenticated recruiter only.
   */
  async getRecruiterStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: "Unauthenticated" });
        return;
      }

      const stats = await dashboardService.getRecruiterStats(req.user.userId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      const err = error as Error;

      if (err.message.includes("Invalid")) {
        res.status(400).json({ success: false, error: err.message });
        return;
      }

      res.status(500).json({
        success: false,
        error: err.message || "Internal server error",
      });
    }
  }
}

export const dashboardController = new DashboardController();
