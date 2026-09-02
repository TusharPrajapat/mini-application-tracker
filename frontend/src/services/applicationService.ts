import { apiClient } from "./apiClient";
import { getAccessToken } from "../utils/tokenStorage";
import {
  CreateApplicationPayload,
  UpdateApplicationStagePayload,
  BulkUpdateApplicationStagePayload,
  BulkUpdateApplicationStageResponse,
  ApplicationListQuery,
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

export async function getApplications(
  query?: ApplicationListQuery
): Promise<ApplicationListResponse> {
  const params = new URLSearchParams();

  if (query?.page !== undefined && query.page > 0) {
    params.append("page", query.page.toString());
  }
  if (query?.limit !== undefined && query.limit > 0) {
    params.append("limit", query.limit.toString());
  }
  if (query?.search && query.search.trim() !== "") {
    params.append("search", query.search.trim());
  }
  if (query?.job_id !== undefined && query.job_id > 0) {
    params.append("job_id", query.job_id.toString());
  }
  if (query?.stage !== undefined && query.stage > 0) {
    params.append("stage", query.stage.toString());
  }
  if (query?.sort) {
    params.append("sort", query.sort);
  }

  const queryString = params.toString();
  const endpoint = queryString
    ? `/api/applications?${queryString}`
    : "/api/applications";

  return apiClient<ApplicationListResponse>(endpoint);
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

export async function bulkUpdateApplicationStage(
  payload: BulkUpdateApplicationStagePayload
): Promise<BulkUpdateApplicationStageResponse> {
  return apiClient<BulkUpdateApplicationStageResponse>(
    "/api/applications/bulk-stage",
    {
      method: "PUT",
      body: JSON.stringify(payload),
    }
  );
}

export async function exportApplications(
  query?: ApplicationListQuery
): Promise<Blob> {
  const params = new URLSearchParams();

  if (query?.search && query.search.trim() !== "") {
    params.append("search", query.search.trim());
  }
  if (query?.job_id !== undefined && query.job_id > 0) {
    params.append("job_id", query.job_id.toString());
  }
  if (query?.stage !== undefined && query.stage > 0) {
    params.append("stage", query.stage.toString());
  }
  if (query?.sort) {
    params.append("sort", query.sort);
  }

  const queryString = params.toString();
  const endpoint = queryString
    ? `/api/applications/export?${queryString}`
    : "/api/applications/export";

  const token = getAccessToken();
  const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    let errorMsg = "Failed to export applications";
    try {
      const errJson = await response.json();
      if (errJson.error) {
        errorMsg = errJson.error;
      }
    } catch {
      // Fallback
    }
    throw new Error(errorMsg);
  }

  return await response.blob();
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
