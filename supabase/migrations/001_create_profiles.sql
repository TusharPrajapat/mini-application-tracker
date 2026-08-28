-- Migration: 001_create_profiles.sql
-- Description: Create profiles table mapping Supabase Auth users to application profiles.

/*
  RELATIONSHIP & ID DESIGN:
  - profiles.id uses BIGSERIAL (BIGINT) as the application's internal relational primary key.
  - auth_user_id uses UUID to reference Supabase Auth's external auth.users.id table.
  - Relational associations are intentionally handled at the Sequelize/application layer.
    The database stores relational IDs as BIGINT values but does not enforce foreign-key constraints.
*/

CREATE TABLE profiles (
    id BIGSERIAL PRIMARY KEY,
    auth_user_id UUID NOT NULL UNIQUE,
    email TEXT NOT NULL,
    role SMALLINT NOT NULL, -- [1 = recruiter, 2 = candidate]
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
