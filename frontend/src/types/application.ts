import { Job } from "./job";

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

export interface ApplicationListResponse {
  success: boolean;
  data: Application[];
}

export interface ApplicationSingleResponse {
  success: boolean;
  message?: string;
  data: Application;
}
