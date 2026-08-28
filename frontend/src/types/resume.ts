export interface ResumeUploadResponse {
  success: boolean;
  message: string;
  data: {
    resumePath: string;
  };
}

export interface ResumeSignedUrlResponse {
  success: boolean;
  data: {
    resumePath: string;
    signedUrl: string;
    expiresIn: number;
  };
}

export interface DeleteResumeResponse {
  success: boolean;
  message: string;
}
