import { ApplicationStage } from "../types/commonEnum";

export interface CreateApplicationDTO {
  job_id: number;
  resume_path?: string;
}

export interface UpdateApplicationStageDTO {
  stage: ApplicationStage;
  version: number;
}
