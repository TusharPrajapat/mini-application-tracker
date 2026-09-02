import { ApplicationStage } from "./application";

export interface TimelineStageItem {
  stage: ApplicationStage;
  label: string;
  completed: boolean;
  current: boolean;
}

export interface ApplicationTimelineData {
  applicationId: number;
  jobId: number;
  jobTitle: string;
  currentStage: ApplicationStage;
  stages: TimelineStageItem[];
}

export interface ApplicationTimelineResponse {
  success: boolean;
  data: ApplicationTimelineData;
}
