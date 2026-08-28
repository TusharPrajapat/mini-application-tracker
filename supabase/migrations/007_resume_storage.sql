-- Migration: 007_resume_storage.sql
-- Description: Create private resumes storage bucket and set up storage RLS policies.

/*
  STORAGE DESIGN & POLICIES:
  - Bucket name: 'resumes' (public = false). Private bucket enforcing backend authentication.
  - Path layout: 'resumes/{profileId}/resume.pdf'
  - Storage RLS checks: (storage.foldername(name))[1] matches current_profile_id()::text.
*/

-- 1. Create Private Storage Bucket 'resumes'
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage Row Level Security Policies on storage.objects
-- Policy 2.1: Candidates can read only their own resume objects
CREATE POLICY "Candidates read own resume object"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'resumes'
  AND (storage.foldername(name))[1] = current_profile_id()::text
);

-- Policy 2.2: Candidates can insert only their own resume object
CREATE POLICY "Candidates insert own resume object"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'resumes'
  AND (storage.foldername(name))[1] = current_profile_id()::text
);

-- Policy 2.3: Candidates can update only their own resume object
CREATE POLICY "Candidates update own resume object"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'resumes'
  AND (storage.foldername(name))[1] = current_profile_id()::text
)
WITH CHECK (
  bucket_id = 'resumes'
  AND (storage.foldername(name))[1] = current_profile_id()::text
);

-- Policy 2.4: Candidates can delete only their own resume object
CREATE POLICY "Candidates delete own resume object"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'resumes'
  AND (storage.foldername(name))[1] = current_profile_id()::text
);
