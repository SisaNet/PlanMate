-- Migration: Add missing columns and update enums for PlanMate v1

-- Update checklist_status enum to include 'pending' and 'flagged'
ALTER TYPE checklist_status ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE checklist_status ADD VALUE IF NOT EXISTS 'flagged';

-- Add label and description columns to checklist_items if not present
ALTER TABLE checklist_items
  ADD COLUMN IF NOT EXISTS label TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS category compliance_category NOT NULL DEFAULT 'administrative',
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_conditional BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS trigger_label TEXT;

-- Add Paystack fields to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS paystack_customer_code TEXT,
  ADD COLUMN IF NOT EXISTS paystack_subscription_code TEXT;

-- Add label field to compliance_rules
ALTER TABLE compliance_rules
  ADD COLUMN IF NOT EXISTS label TEXT NOT NULL DEFAULT '';

-- Add project fields for parameters
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS site_area_sqm NUMERIC,
  ADD COLUMN IF NOT EXISTS coverage_sqm NUMERIC,
  ADD COLUMN IF NOT EXISTS height_m NUMERIC,
  ADD COLUMN IF NOT EXISTS front_setback_m NUMERIC,
  ADD COLUMN IF NOT EXISTS side_setback_m NUMERIC,
  ADD COLUMN IF NOT EXISTS rear_setback_m NUMERIC,
  ADD COLUMN IF NOT EXISTS parking_bays INTEGER,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;

-- Create drawing_checklist_items table
CREATE TABLE IF NOT EXISTS drawing_checklist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  drawing_name TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN DEFAULT TRUE,
  is_complete BOOLEAN DEFAULT FALSE,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drawing_checklist_project ON drawing_checklist_items(project_id);

-- Create fee_schedules table
CREATE TABLE IF NOT EXISTS fee_schedules (
  id SERIAL PRIMARY KEY,
  municipality_id INTEGER NOT NULL REFERENCES municipalities(id),
  building_type TEXT,
  fee_per_sqm NUMERIC NOT NULL DEFAULT 0,
  min_fee NUMERIC NOT NULL DEFAULT 0,
  plan_scrutiny_fee NUMERIC,
  building_inspection_fee NUMERIC,
  sundry_fee NUMERIC,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fee_schedules_municipality ON fee_schedules(municipality_id);

-- Add zone_parameters columns if missing
ALTER TABLE zone_parameters
  ADD COLUMN IF NOT EXISTS coverage_max NUMERIC,
  ADD COLUMN IF NOT EXISTS far_max NUMERIC,
  ADD COLUMN IF NOT EXISTS height_max_m NUMERIC,
  ADD COLUMN IF NOT EXISTS front_setback_m NUMERIC,
  ADD COLUMN IF NOT EXISTS side_setback_m NUMERIC,
  ADD COLUMN IF NOT EXISTS rear_setback_m NUMERIC;

-- RLS for new tables
ALTER TABLE drawing_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_schedules ENABLE ROW LEVEL SECURITY;

-- Drawing checklist: users can manage their project's drawings
CREATE POLICY "Users can view own project drawings"
  ON drawing_checklist_items FOR SELECT
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own project drawings"
  ON drawing_checklist_items FOR INSERT
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own project drawings"
  ON drawing_checklist_items FOR UPDATE
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own project drawings"
  ON drawing_checklist_items FOR DELETE
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- Fee schedules: public read
CREATE POLICY "Fee schedules are viewable by all"
  ON fee_schedules FOR SELECT
  USING (true);
