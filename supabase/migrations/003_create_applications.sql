-- Migration: 003_create_applications.sql
-- Description: Create applications table for candidate job applications.

/*
  RELATIONSHIP & CONSTRAINTS DESIGN:
  - Relational associations are intentionally handled at the Sequelize/application layer.
    The database stores job_id and candidate_id as BIGINT values but does not enforce foreign-key constraints.
  - The database-level UNIQUE(job_id, candidate_id) constraint is intentionally retained
    because duplicate application prevention must remain safe under concurrent requests.
*/

CREATE TABLE applications (
    id BIGSERIAL PRIMARY KEY,
    job_id BIGINT NOT NULL,
    candidate_id BIGINT NOT NULL,
    resume_path TEXT,
    stage SMALLINT NOT NULL DEFAULT 1, -- [1 = applied, 2 = screening, 3 = interview, 4 = offer, 5 = rejected]
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    /*
      DUPLICATE APPLICATION CONSTRAINT:
      Enforces at the database layer that a candidate cannot apply to the same job more than once.
      Serves as the final data-integrity guarantee against race conditions.
    */
    CONSTRAINT uq_applications_job_candidate UNIQUE (job_id, candidate_id)
);

-- INDEXES
-- Index 1: Supports retrieving applications belonging to a specific job
CREATE INDEX idx_applications_job_id ON applications (job_id);

-- Index 2: Supports retrieving applications belonging to a specific candidate
CREATE INDEX idx_applications_candidate_id ON applications (candidate_id);
