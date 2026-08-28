-- Migration: 006_create_candidate_profiles.sql
-- Description: Create candidate_profiles 1-to-1 table for candidate profile details with RLS policies.

/*
  RELATIONSHIP & CONSTRAINTS:
  - candidate_profiles.profile_id is a BIGINT NOT NULL UNIQUE referencing public.profiles(id) ON DELETE CASCADE.
  - The UNIQUE constraint guarantees a 1-to-1 relationship between profiles and candidate_profiles.
  - RLS uses existing SECURITY DEFINER helper functions: current_profile_id() and current_profile_role().
*/

-- 1. Create Table
CREATE TABLE public.candidate_profiles (
    id BIGSERIAL PRIMARY KEY,
    profile_id BIGINT NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20),
    skills TEXT,
    experience TEXT,
    resume_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create Index
CREATE INDEX idx_candidate_profiles_profile_id ON public.candidate_profiles (profile_id);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.candidate_profiles ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES
-- Policy 4.1: SELECT - Candidates read own profile; Recruiters read candidate profiles
CREATE POLICY "Candidates read own candidate_profile or Recruiters read"
ON public.candidate_profiles FOR SELECT
USING (
  (current_profile_role() = 2 AND profile_id = current_profile_id())
  OR
  (current_profile_role() = 1)
);

-- Policy 4.2: INSERT - Only Candidate can insert their own candidate_profile
CREATE POLICY "Candidates insert own candidate_profile"
ON public.candidate_profiles FOR INSERT
WITH CHECK (
  current_profile_role() = 2
  AND profile_id = current_profile_id()
);

-- Policy 4.3: UPDATE - Only Candidate can update their own candidate_profile
CREATE POLICY "Candidates update own candidate_profile"
ON public.candidate_profiles FOR UPDATE
USING (
  current_profile_role() = 2
  AND profile_id = current_profile_id()
)
WITH CHECK (
  current_profile_role() = 2
  AND profile_id = current_profile_id()
);

-- Policy 4.4: DELETE - Only Candidate can delete their own candidate_profile
CREATE POLICY "Candidates delete own candidate_profile"
ON public.candidate_profiles FOR DELETE
USING (
  current_profile_role() = 2
  AND profile_id = current_profile_id()
);
