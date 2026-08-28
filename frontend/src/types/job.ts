export enum JobStatus {
  CLOSED = 0,
  DRAFT = 1,
  OPEN = 2,
}

export interface Job {
  id: number;
  recruiter_id: number;
  title: string;
  description: string;
  status: JobStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateJobPayload {
  title: string;
  description: string;
  status?: JobStatus;
}

export interface UpdateJobPayload {
  title?: string;
  description?: string;
  status?: JobStatus;
}

export interface JobListResponse {
  success: boolean;
  data: Job[];
}

export interface JobSingleResponse {
  success: boolean;
  message?: string;
  data: Job;
}

export interface DeleteJobResponse {
  success: boolean;
  message: string;
}
