import { apiClient } from "./apiClient";
import {
  CreateJobPayload,
  UpdateJobPayload,
  JobListResponse,
  JobSingleResponse,
  DeleteJobResponse,
} from "../types/job";

export async function getJobs(): Promise<JobListResponse> {
  return apiClient<JobListResponse>("/api/jobs");
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
