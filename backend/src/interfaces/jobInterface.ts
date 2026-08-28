import { JobStatus } from "../types/commonEnum";

export interface CreateJobDTO {
  title: string;
  description: string;
  status?: JobStatus;
}

export interface UpdateJobDTO {
  title?: string;
  description?: string;
  status?: JobStatus;
}
