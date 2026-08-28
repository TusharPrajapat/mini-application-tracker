import { apiClient } from "./apiClient";
import {
  CreateApplicationPayload,
  UpdateApplicationStagePayload,
  ApplicationListResponse,
  ApplicationSingleResponse,
  ApplicationCandidateProfileResponse,
  ApplicationCandidateResumeResponse,
} from "../types/application";

export async function createApplication(
  payload: CreateApplicationPayload
): Promise<ApplicationSingleResponse> {
  return apiClient<ApplicationSingleResponse>("/api/applications", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getApplications(): Promise<ApplicationListResponse> {
  return apiClient<ApplicationListResponse>("/api/applications");
}

export async function getApplicationById(
  id: number
): Promise<ApplicationSingleResponse> {
  return apiClient<ApplicationSingleResponse>(`/api/applications/${id}`);
}

export async function updateApplicationStage(
  id: number,
  payload: UpdateApplicationStagePayload
): Promise<ApplicationSingleResponse> {
  return apiClient<ApplicationSingleResponse>(`/api/applications/${id}/stage`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function getCandidateProfileForApplication(
  applicationId: number
): Promise<ApplicationCandidateProfileResponse> {
  return apiClient<ApplicationCandidateProfileResponse>(
    `/api/applications/${applicationId}/candidate-profile`
  );
}

export async function getCandidateResumeForApplication(
  applicationId: number
): Promise<ApplicationCandidateResumeResponse> {
  return apiClient<ApplicationCandidateResumeResponse>(
    `/api/applications/${applicationId}/candidate-resume`
  );
}
