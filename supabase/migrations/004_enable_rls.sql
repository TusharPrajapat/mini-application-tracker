-- Migration: 004_enable_rls.sql
-- Description: Enable Row Level Security (RLS) and define security policies for profiles, jobs, and applications.

/*
  AUTH TO PROFILE MAPPING:
  - auth.uid() returns the authenticated Supabase user's UUID from auth.users.
  - profiles.auth_user_id (UUID) maps to auth.users.id.
  - profiles.id (BIGINT) is the application's internal relational primary key.
  
  SECURITY DEFINER HELPER FUNCTIONS:
  To avoid recursive RLS queries on the profiles table, helper functions are defined
  with SECURITY DEFINER so they execute with elevated privileges to look up the caller's
  profile ID and role without triggering infinite RLS policy recursion.
*/

-- 1. Helper Functions
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS BIGINT AS $$
  SELECT id FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS SMALLINT AS $$
  SELECT role FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;


-- 2. Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;


-- 3. PROFILES POLICIES
-- Policy 3.1: Users can read their own profile, or Recruiters can read profiles of applicants
CREATE POLICY "Users can read own profile or Recruiters read applicants"
ON public.profiles FOR SELECT
USING (
  auth_user_id = auth.uid()
  OR current_profile_role() = 1
);

-- Policy 3.2: Users can insert their own profile matching auth.uid()
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (
  auth_user_id = auth.uid()
);

-- Policy 3.3: Users can update their own profile, but role cannot be altered
CREATE POLICY "Users can update own profile except role"
ON public.profiles FOR UPDATE
USING (
  auth_user_id = auth.uid()
)
WITH CHECK (
  auth_user_id = auth.uid()
  AND role = (SELECT role FROM public.profiles WHERE auth_user_id = auth.uid())
);


-- 4. JOBS POLICIES
-- Policy 4.1: Recruiters can read their own jobs, Candidates can read OPEN jobs (status = 2)
CREATE POLICY "Recruiters read own jobs or Candidates read open jobs"
ON public.jobs FOR SELECT
USING (
  (current_profile_role() = 1 AND recruiter_id = current_profile_id())
  OR
  (current_profile_role() = 2 AND status = 2)
);

-- Policy 4.2: Recruiters can create jobs for themselves
CREATE POLICY "Recruiters can insert own jobs"
ON public.jobs FOR INSERT
WITH CHECK (
  current_profile_role() = 1 AND recruiter_id = current_profile_id()
);

-- Policy 4.3: Recruiters can update their own jobs
CREATE POLICY "Recruiters can update own jobs"
ON public.jobs FOR UPDATE
USING (
  current_profile_role() = 1 AND recruiter_id = current_profile_id()
)
WITH CHECK (
  current_profile_role() = 1 AND recruiter_id = current_profile_id()
);

-- Policy 4.4: Recruiters can delete their own jobs
CREATE POLICY "Recruiters can delete own jobs"
ON public.jobs FOR DELETE
USING (
  current_profile_role() = 1 AND recruiter_id = current_profile_id()
);


-- 5. APPLICATIONS POLICIES
-- Policy 5.1: Candidates read their own applications, Recruiters read applications for their jobs
CREATE POLICY "Candidates read own apps or Recruiters read apps for own jobs"
ON public.applications FOR SELECT
USING (
  (current_profile_role() = 2 AND candidate_id = current_profile_id())
  OR
  (current_profile_role() = 1 AND job_id IN (SELECT id FROM public.jobs WHERE recruiter_id = current_profile_id()))
);

-- Policy 5.2: Candidates can apply to OPEN jobs for themselves
CREATE POLICY "Candidates can apply to open jobs"
ON public.applications FOR INSERT
WITH CHECK (
  current_profile_role() = 2
  AND candidate_id = current_profile_id()
  AND stage = 1
  AND job_id IN (SELECT id FROM public.jobs WHERE status = 2)
);

-- Policy 5.3: Recruiters can update stage for applications to their own jobs
CREATE POLICY "Recruiters can update application stage for own jobs"
ON public.applications FOR UPDATE
USING (
  current_profile_role() = 1
  AND job_id IN (SELECT id FROM public.jobs WHERE recruiter_id = current_profile_id())
)
WITH CHECK (
  current_profile_role() = 1
  AND job_id IN (SELECT id FROM public.jobs WHERE recruiter_id = current_profile_id())
);
