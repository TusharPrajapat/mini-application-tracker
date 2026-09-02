import { Job, PaginationMeta } from "./job";

export enum ApplicationStage {
  APPLIED = 1,
  SCREENING = 2,
  INTERVIEW = 3,
  OFFER = 4,
  REJECTED = 5,
}

export interface CandidateInfo {
  id: number;
  email: string;
  role: number;
  candidateProfile?: {
    full_name: string;
    phone?: string | null;
    skills?: string | null;
    experience?: string | null;
    resume_path?: string | null;
  } | null;
}

export interface Application {
  id: number;
  job_id: number;
  candidate_id: number;
  resume_path?: string | null;
  stage: ApplicationStage;
  version: number;
  created_at: string;
  updated_at: string;
  job?: Job;
  candidate?: CandidateInfo;
}

export interface CreateApplicationPayload {
  job_id: number;
  resume_path?: string;
}

export interface UpdateApplicationStagePayload {
  stage: ApplicationStage;
  version: number;
}

export interface BulkUpdateApplicationStagePayload {
  applicationIds: (number | string)[];
  stage: ApplicationStage;
}

export interface BulkStageItemResult {
  application_id: number;
  success: boolean;
  error?: string;
}

export interface BulkUpdateApplicationStageResponse {
  success: boolean;
  message: string;
  updatedCount: number;
  results?: BulkStageItemResult[];
}

export interface ApplicationListQuery {
  page?: number;
  limit?: number;
  search?: string;
  job_id?: number;
  stage?: ApplicationStage;
  sort?: "newest" | "oldest";
}

export interface ApplicationListResponse {
  success: boolean;
  data: {
    applications: Application[];
    pagination: PaginationMeta;
  };
}

export interface ApplicationSingleResponse {
  success: boolean;
  message?: string;
  data: Application;
}

export interface ApplicationCandidateProfileResponse {
  success: boolean;
  data: {
    candidate: {
      id: number;
      email: string;
      role: number;
    };
    profile: {
      full_name: string;
      phone?: string | null;
      skills?: string | null;
      experience?: string | null;
      resume_path?: string | null;
      created_at: string;
      updated_at: string;
    };
  };
}

export interface ApplicationCandidateResumeResponse {
  success: boolean;
  data: {
    signedUrl: string;
    expiresIn: number;
  };
}
