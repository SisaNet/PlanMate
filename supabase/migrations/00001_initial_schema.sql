-- PlanMate Database Schema
-- South African Building Plan Compliance Checker

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================
CREATE TYPE user_role AS ENUM ('admin', 'staff', 'individual');
CREATE TYPE plan_tier AS ENUM ('free', 'professional');
CREATE TYPE municipality_type AS ENUM ('local', 'metropolitan');
CREATE TYPE submission_method AS ENUM ('electronic', 'counter', 'both');
CREATE TYPE project_status AS ENUM ('draft', 'in_progress', 'ready', 'submitted', 'approved');
CREATE TYPE checklist_status AS ENUM ('pending', 'complete', 'flagged', 'not_applicable');
CREATE TYPE compliance_category AS ENUM (
  'administrative',
  'ownership_property',
  'professional_appointments',
  'drawing_set',
  'energy_environmental',
  'engineering_structural',
  'special_conditions'
);
CREATE TYPE notification_type AS ENUM ('deadline', 'data_change', 'inspection', 'system');
CREATE TYPE correction_status AS ENUM ('pending', 'accepted', 'rejected');
CREATE TYPE inspection_status AS ENUM ('pending', 'completed');
CREATE TYPE ai_message_role AS ENUM ('user', 'assistant');

-- ============================================
-- PRACTICES
-- ============================================
CREATE TABLE practices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  logo_url TEXT,
  paystack_customer_id TEXT,
  paystack_subscription_code TEXT,
  max_users INTEGER DEFAULT 20,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PROFILES (extends auth.users)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT,
  sacap_number TEXT,
  sacap_category TEXT,
  practice_id UUID REFERENCES practices(id) ON DELETE SET NULL,
  role user_role DEFAULT 'individual',
  plan_tier plan_tier DEFAULT 'free',
  paystack_customer_code TEXT,
  paystack_subscription_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PROVINCES
-- ============================================
CREATE TABLE provinces (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE
);

-- ============================================
-- DISTRICT MUNICIPALITIES
-- ============================================
CREATE TABLE district_municipalities (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  province_id INTEGER NOT NULL REFERENCES provinces(id),
  UNIQUE(name, province_id)
);

-- ============================================
-- MUNICIPALITIES
-- ============================================
CREATE TABLE municipalities (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  municipality_type municipality_type NOT NULL DEFAULT 'local',
  district_id INTEGER REFERENCES district_municipalities(id),
  province_id INTEGER NOT NULL REFERENCES provinces(id),
  aliases TEXT[] DEFAULT '{}',
  submission_method submission_method DEFAULT 'counter',
  portal_url TEXT,
  application_form_url TEXT,
  fee_schedule_url TEXT,
  physical_address TEXT,
  phone TEXT,
  email TEXT,
  office_hours TEXT,
  plan_validity_months INTEGER DEFAULT 12,
  last_verified_at TIMESTAMPTZ,
  climate_zone INTEGER CHECK (climate_zone BETWEEN 1 AND 6),
  risk_flags JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ZONE PARAMETERS
-- ============================================
CREATE TABLE zone_parameters (
  id SERIAL PRIMARY KEY,
  municipality_id INTEGER NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
  zone_code TEXT NOT NULL,
  zone_name TEXT,
  front_building_line_m NUMERIC(5,2),
  lateral_building_line_m NUMERIC(5,2),
  rear_building_line_m NUMERIC(5,2),
  max_coverage_pct NUMERIC(5,2),
  max_height_m NUMERIC(5,2),
  far NUMERIC(5,3),
  min_erf_size_sqm NUMERIC(10,2),
  parking_ratio TEXT,
  coverage_max NUMERIC(5,2),
  far_max NUMERIC(5,3),
  height_max_m NUMERIC(5,2),
  front_setback_m NUMERIC(5,2),
  side_setback_m NUMERIC(5,2),
  rear_setback_m NUMERIC(5,2),
  coverage_tiers JSONB,
  source_scheme TEXT,
  source_clause TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(municipality_id, zone_code)
);

-- ============================================
-- PROJECTS
-- ============================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  practice_id UUID REFERENCES practices(id) ON DELETE SET NULL,
  municipality_id INTEGER REFERENCES municipalities(id),
  zone_parameter_id INTEGER REFERENCES zone_parameters(id),
  status project_status DEFAULT 'draft',
  name TEXT NOT NULL,
  street_address TEXT,
  erf_number TEXT,
  zoning TEXT,
  building_type TEXT CHECK (building_type IN ('A','B','C','D','E','F','G','H')),
  building_use_description TEXT,
  gfa_sqm NUMERIC(10,2),
  site_area_sqm NUMERIC(10,2),
  coverage_sqm NUMERIC(10,2),
  height_m NUMERIC(5,2),
  front_setback_m NUMERIC(5,2),
  side_setback_m NUMERIC(5,2),
  rear_setback_m NUMERIC(5,2),
  parking_bays INTEGER,
  storeys INTEGER,
  owner_name TEXT,
  owner_contact TEXT,
  is_coastal BOOLEAN DEFAULT FALSE,
  is_heritage BOOLEAN DEFAULT FALSE,
  is_addition BOOLEAN DEFAULT FALSE,
  is_sectional_title BOOLEAN DEFAULT FALSE,
  is_communal_land BOOLEAN DEFAULT FALSE,
  is_dolomite_zone BOOLEAN DEFAULT FALSE,
  wizard_step INTEGER DEFAULT 1,
  wizard_data JSONB DEFAULT '{}',
  submitted_at TIMESTAMPTZ,
  approval_date DATE,
  lapse_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- COMPLIANCE RULES
-- ============================================
CREATE TABLE compliance_rules (
  id SERIAL PRIMARY KEY,
  category compliance_category NOT NULL,
  name TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  description TEXT,
  why_applicable TEXT,
  source_legislation TEXT,
  where_to_obtain TEXT,
  conditions JSONB DEFAULT '{}',
  municipality_id INTEGER REFERENCES municipalities(id) ON DELETE CASCADE,
  is_conditional BOOLEAN DEFAULT FALSE,
  trigger_label TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CHECKLIST ITEMS
-- ============================================
CREATE TABLE checklist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  rule_id INTEGER NOT NULL REFERENCES compliance_rules(id),
  label TEXT NOT NULL DEFAULT '',
  description TEXT,
  category compliance_category NOT NULL DEFAULT 'administrative',
  status checklist_status DEFAULT 'pending',
  sort_order INTEGER DEFAULT 0,
  notes TEXT,
  is_conditional BOOLEAN DEFAULT FALSE,
  trigger_label TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RISK FLAG DEFINITIONS
-- ============================================
CREATE TABLE risk_flag_definitions (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  requirements TEXT,
  administering_authority TEXT,
  typical_timeframe TEXT,
  info_url TEXT,
  conditions JSONB DEFAULT '{}',
  related_rule_ids INTEGER[] DEFAULT '{}'
);

-- ============================================
-- PROJECT RISK FLAGS
-- ============================================
CREATE TABLE project_risk_flags (
  id SERIAL PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  risk_flag_id INTEGER NOT NULL REFERENCES risk_flag_definitions(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, risk_flag_id)
);

-- ============================================
-- DRAWING CHECKLIST ITEMS
-- ============================================
CREATE TABLE drawing_checklist_items (
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

-- ============================================
-- FEE SCHEDULES
-- ============================================
CREATE TABLE fee_schedules (
  id SERIAL PRIMARY KEY,
  municipality_id INTEGER NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
  building_type TEXT,
  fee_per_sqm NUMERIC NOT NULL DEFAULT 0,
  min_fee NUMERIC NOT NULL DEFAULT 0,
  plan_scrutiny_fee NUMERIC,
  building_inspection_fee NUMERIC,
  sundry_fee NUMERIC,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DOCUMENTS
-- ============================================
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT '',
  file_size BIGINT DEFAULT 0,
  storage_path TEXT NOT NULL DEFAULT '',
  category TEXT DEFAULT 'other',
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NOTIFICATIONS
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  message TEXT,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  action_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AI CONVERSATIONS
-- ============================================
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ai_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role ai_message_role NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DATA CORRECTIONS
-- ============================================
CREATE TABLE data_corrections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  field_name TEXT NOT NULL,
  current_value TEXT,
  suggested_value TEXT NOT NULL,
  reason TEXT,
  status correction_status DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INSPECTION STAGES
-- ============================================
CREATE TABLE inspection_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage_name TEXT NOT NULL,
  scheduled_date DATE,
  completed_date DATE,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_profiles_practice ON profiles(practice_id);
CREATE INDEX idx_municipalities_province ON municipalities(province_id);
CREATE INDEX idx_municipalities_district ON municipalities(district_id);
CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_projects_municipality ON projects(municipality_id);
CREATE INDEX idx_projects_practice ON projects(practice_id);
CREATE INDEX idx_checklist_project ON checklist_items(project_id);
CREATE INDEX idx_checklist_rule ON checklist_items(rule_id);
CREATE INDEX idx_drawing_checklist_project ON drawing_checklist_items(project_id);
CREATE INDEX idx_fee_schedules_municipality ON fee_schedules(municipality_id);
CREATE INDEX idx_documents_project ON documents(project_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_ai_messages_conversation ON ai_messages(conversation_id);
CREATE INDEX idx_data_corrections_project ON data_corrections(project_id);
CREATE INDEX idx_inspection_stages_project ON inspection_stages(project_id);

-- ============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_municipalities_updated_at
  BEFORE UPDATE ON municipalities FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_practices_updated_at
  BEFORE UPDATE ON practices FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_checklist_items_updated_at
  BEFORE UPDATE ON checklist_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_drawing_checklist_updated_at
  BEFORE UPDATE ON drawing_checklist_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
