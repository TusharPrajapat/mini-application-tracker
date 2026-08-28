import { apiClient } from "./apiClient";
import {
  CreateCandidateProfilePayload,
  UpdateCandidateProfilePayload,
  CandidateProfileResponse,
  DeleteCandidateProfileResponse,
} from "../types/candidateProfile";

export async function getProfile(): Promise<CandidateProfileResponse> {
  return apiClient<CandidateProfileResponse>("/api/profile");
}

export async function createProfile(
  payload: CreateCandidateProfilePayload
): Promise<CandidateProfileResponse> {
  return apiClient<CandidateProfileResponse>("/api/profile", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateProfile(
  payload: UpdateCandidateProfilePayload
): Promise<CandidateProfileResponse> {
  return apiClient<CandidateProfileResponse>("/api/profile", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteProfile(): Promise<DeleteCandidateProfileResponse> {
  return apiClient<DeleteCandidateProfileResponse>("/api/profile", {
    method: "DELETE",
  });
}
