import { apiClient } from "./apiClient";
import {
  ResumeUploadResponse,
  ResumeSignedUrlResponse,
  DeleteResumeResponse,
} from "../types/resume";

export async function uploadResume(file: File): Promise<ResumeUploadResponse> {
  const formData = new FormData();
  formData.append("resume", file);

  return apiClient<ResumeUploadResponse>("/api/profile/resume", {
    method: "POST",
    body: formData,
  });
}

export async function getResume(): Promise<ResumeSignedUrlResponse> {
  return apiClient<ResumeSignedUrlResponse>("/api/profile/resume");
}

export async function deleteResume(): Promise<DeleteResumeResponse> {
  return apiClient<DeleteResumeResponse>("/api/profile/resume", {
    method: "DELETE",
  });
}
