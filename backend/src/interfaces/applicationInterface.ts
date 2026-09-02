import { ApplicationStage } from "../types/commonEnum";

export interface CreateApplicationDTO {
  job_id: number;
  resume_path?: string;
}

export interface UpdateApplicationStageDTO {
  stage: ApplicationStage;
  version: number;
}

export interface BulkUpdateApplicationStageDTO {
  applicationIds: (number | string)[];
  stage: ApplicationStage;
}

export interface BulkStageItemResult {
  application_id: number;
  success: boolean;
  error?: string;
}

export interface BulkUpdateApplicationStageResponse {
  updatedCount: number;
  results: BulkStageItemResult[];
}

export interface ApplicationListQuery {
  page?: number;
  limit?: number;
  search?: string;
  job_id?: number;
  stage?: ApplicationStage;
  sort?: "newest" | "oldest";
}
