-- Migration: 002_create_jobs.sql
-- Description: Create jobs table for recruiter job postings.

/*
  RELATIONSHIP DESIGN:
  - Relational associations are intentionally handled at the Sequelize/application layer.
    The database stores recruiter_id as a BIGINT value but does not enforce foreign-key constraints.
*/

CREATE TABLE jobs (
    id BIGSERIAL PRIMARY KEY,
    recruiter_id BIGINT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status SMALLINT NOT NULL DEFAULT 1, -- [0 -> closed, 1 -> draft, 2 -> open]
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES
-- Supports fetching all job postings belonging to a specific recruiter
CREATE INDEX idx_jobs_recruiter_id ON jobs (recruiter_id);
