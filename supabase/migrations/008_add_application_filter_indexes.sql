-- Migration: 008_add_application_filter_indexes.sql
-- Description: Add index on applications.stage to optimize stage filtering queries.

/*
  INDEX PERFORMANCE OPTIMIZATION:
  - idx_applications_stage improves lookup speed when recruiters filter applications by ApplicationStage enum values.
*/

CREATE INDEX idx_applications_stage ON public.applications (stage);
