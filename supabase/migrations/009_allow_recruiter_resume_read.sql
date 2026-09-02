-- Migration: 009_allow_recruiter_resume_read.sql
-- Description: Allow recruiters to read candidate resume objects from private resumes bucket.

/*
  STORAGE RLS RECRUITER READ POLICY:
  - Recruiters (current_profile_role() = 1) can SELECT objects from the 'resumes' bucket
    to generate short-lived signed URLs for candidate applications.
*/

CREATE POLICY "Recruiters read candidate resumes"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'resumes'
  AND current_profile_role() = 1
);
