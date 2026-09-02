import { apiClient } from "./apiClient";
import { ApplicationTimelineResponse } from "../types/applicationTimeline";

export async function getApplicationTimeline(
  applicationId: number
): Promise<ApplicationTimelineResponse> {
  return apiClient<ApplicationTimelineResponse>(
    `/api/applications/${applicationId}/timeline`
  );
}
