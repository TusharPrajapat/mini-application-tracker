import { apiClient } from "./apiClient";
import { RecruiterStatsResponse } from "../types/dashboard";

export async function getRecruiterStats(): Promise<RecruiterStatsResponse> {
  return apiClient<RecruiterStatsResponse>("/api/dashboard/recruiter/stats");
}
