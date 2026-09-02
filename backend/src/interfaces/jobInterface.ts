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

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface JobListQuery {
  page?: number;
  limit?: number;
}
