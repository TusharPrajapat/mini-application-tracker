import { apiClient } from "./apiClient";
import {
  CreateJobPayload,
  UpdateJobPayload,
  JobListQuery,
  JobListResponse,
  JobSingleResponse,
  DeleteJobResponse,
} from "../types/job";

export async function getJobs(query?: JobListQuery): Promise<JobListResponse> {
  const params = new URLSearchParams();
  if (query?.page !== undefined && query.page > 0) {
    params.append("page", query.page.toString());
  }
  if (query?.limit !== undefined && query.limit > 0) {
    params.append("limit", query.limit.toString());
  }
  const queryString = params.toString();
  const endpoint = queryString ? `/api/jobs?${queryString}` : "/api/jobs";

  return apiClient<JobListResponse>(endpoint);
}

export async function getJobById(id: number): Promise<JobSingleResponse> {
  return apiClient<JobSingleResponse>(`/api/jobs/${id}`);
}

export async function createJob(
  payload: CreateJobPayload
): Promise<JobSingleResponse> {
  return apiClient<JobSingleResponse>("/api/jobs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateJob(
  id: number,
  payload: UpdateJobPayload
): Promise<JobSingleResponse> {
  return apiClient<JobSingleResponse>(`/api/jobs/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteJob(id: number): Promise<DeleteJobResponse> {
  return apiClient<DeleteJobResponse>(`/api/jobs/${id}`, {
    method: "DELETE",
  });
}
