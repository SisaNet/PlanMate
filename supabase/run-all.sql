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


-- ===== RLS POLICIES =====

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE practices ENABLE ROW LEVEL SECURITY;
ALTER TABLE provinces ENABLE ROW LEVEL SECURITY;
ALTER TABLE district_municipalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE municipalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_flag_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_risk_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_stages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PUBLIC READ (reference data)
-- ============================================
CREATE POLICY "provinces_read" ON provinces FOR SELECT USING (true);
CREATE POLICY "districts_read" ON district_municipalities FOR SELECT USING (true);
CREATE POLICY "municipalities_read" ON municipalities FOR SELECT USING (true);
CREATE POLICY "zone_params_read" ON zone_parameters FOR SELECT USING (true);
CREATE POLICY "compliance_rules_read" ON compliance_rules FOR SELECT USING (true);
CREATE POLICY "risk_flags_read" ON risk_flag_definitions FOR SELECT USING (true);
CREATE POLICY "fee_schedules_read" ON fee_schedules FOR SELECT USING (true);

-- ============================================
-- PROFILES
-- ============================================
CREATE POLICY "profiles_own_read" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_practice_read" ON profiles
  FOR SELECT USING (
    practice_id IS NOT NULL
    AND practice_id = (SELECT practice_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "profiles_own_update" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================
-- PRACTICES
-- ============================================
CREATE POLICY "practices_member_read" ON practices
  FOR SELECT USING (
    id = (SELECT practice_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "practices_admin_update" ON practices
  FOR UPDATE USING (
    id = (SELECT practice_id FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- PROJECTS
-- ============================================
CREATE POLICY "projects_own_read" ON projects
  FOR SELECT USING (
    user_id = auth.uid()
    OR practice_id = (SELECT practice_id FROM profiles WHERE id = auth.uid() AND practice_id IS NOT NULL)
  );

CREATE POLICY "projects_own_insert" ON projects
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "projects_own_update" ON projects
  FOR UPDATE USING (
    user_id = auth.uid()
    OR practice_id = (SELECT practice_id FROM profiles WHERE id = auth.uid() AND practice_id IS NOT NULL)
  );

CREATE POLICY "projects_own_delete" ON projects
  FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- CHECKLIST ITEMS
-- ============================================
CREATE POLICY "checklist_project_read" ON checklist_items
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
      OR practice_id = (SELECT practice_id FROM profiles WHERE id = auth.uid() AND practice_id IS NOT NULL)
    )
  );

CREATE POLICY "checklist_project_insert" ON checklist_items
  FOR INSERT WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

CREATE POLICY "checklist_project_update" ON checklist_items
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
      OR practice_id = (SELECT practice_id FROM profiles WHERE id = auth.uid() AND practice_id IS NOT NULL)
    )
  );

-- ============================================
-- PROJECT RISK FLAGS
-- ============================================
CREATE POLICY "risk_flags_project_read" ON project_risk_flags
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
      OR practice_id = (SELECT practice_id FROM profiles WHERE id = auth.uid() AND practice_id IS NOT NULL)
    )
  );

CREATE POLICY "risk_flags_project_insert" ON project_risk_flags
  FOR INSERT WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- ============================================
-- DRAWING CHECKLIST
-- ============================================
CREATE POLICY "drawing_checklist_read" ON drawing_checklist_items
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
      OR practice_id = (SELECT practice_id FROM profiles WHERE id = auth.uid() AND practice_id IS NOT NULL)
    )
  );

CREATE POLICY "drawing_checklist_insert" ON drawing_checklist_items
  FOR INSERT WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

CREATE POLICY "drawing_checklist_update" ON drawing_checklist_items
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
      OR practice_id = (SELECT practice_id FROM profiles WHERE id = auth.uid() AND practice_id IS NOT NULL)
    )
  );

-- ============================================
-- DOCUMENTS
-- ============================================
CREATE POLICY "documents_project_read" ON documents
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
      OR practice_id = (SELECT practice_id FROM profiles WHERE id = auth.uid() AND practice_id IS NOT NULL)
    )
  );

CREATE POLICY "documents_own_insert" ON documents
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================
-- NOTIFICATIONS
-- ============================================
CREATE POLICY "notifications_own_read" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notifications_own_update" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- ============================================
-- AI CONVERSATIONS
-- ============================================
CREATE POLICY "ai_convo_own_read" ON ai_conversations
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "ai_convo_own_insert" ON ai_conversations
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "ai_msg_convo_read" ON ai_messages
  FOR SELECT USING (
    conversation_id IN (SELECT id FROM ai_conversations WHERE user_id = auth.uid())
  );

CREATE POLICY "ai_msg_convo_insert" ON ai_messages
  FOR INSERT WITH CHECK (
    conversation_id IN (SELECT id FROM ai_conversations WHERE user_id = auth.uid())
  );

-- ============================================
-- DATA CORRECTIONS
-- ============================================
CREATE POLICY "corrections_own_read" ON data_corrections
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "corrections_own_insert" ON data_corrections
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================
-- INSPECTION STAGES
-- ============================================
CREATE POLICY "inspections_project_read" ON inspection_stages
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
      OR practice_id = (SELECT practice_id FROM profiles WHERE id = auth.uid() AND practice_id IS NOT NULL)
    )
  );

CREATE POLICY "inspections_project_insert" ON inspection_stages
  FOR INSERT WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

CREATE POLICY "inspections_project_update" ON inspection_stages
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
      OR practice_id = (SELECT practice_id FROM profiles WHERE id = auth.uid() AND practice_id IS NOT NULL)
    )
  );


-- ===== SEED DATA =====

-- ============================================
-- SEED: PROVINCES
-- ============================================
INSERT INTO provinces (name, code) VALUES
  ('Eastern Cape', 'EC'),
  ('Free State', 'FS'),
  ('Gauteng', 'GP'),
  ('KwaZulu-Natal', 'KZN'),
  ('Limpopo', 'LP'),
  ('Mpumalanga', 'MP'),
  ('North West', 'NW'),
  ('Northern Cape', 'NC'),
  ('Western Cape', 'WC');

-- ============================================
-- SEED: DISTRICT MUNICIPALITIES
-- ============================================
-- Eastern Cape
INSERT INTO district_municipalities (name, province_id) VALUES
  ('Alfred Nzo', 1), ('Amathole', 1), ('Chris Hani', 1),
  ('Joe Gqabi', 1), ('O.R. Tambo', 1), ('Sarah Baartman', 1);

-- Free State
INSERT INTO district_municipalities (name, province_id) VALUES
  ('Fezile Dabi', 2), ('Lejweleputswa', 2), ('Thabo Mofutsanyana', 2),
  ('Xhariep', 2);

-- Gauteng
INSERT INTO district_municipalities (name, province_id) VALUES
  ('Sedibeng', 3), ('West Rand', 3);

-- KwaZulu-Natal
INSERT INTO district_municipalities (name, province_id) VALUES
  ('Amajuba', 4), ('Harry Gwala', 4), ('iLembe', 4),
  ('King Cetshwayo', 4), ('Ugu', 4), ('uMgungundlovu', 4),
  ('uMkhanyakude', 4), ('uMzinyathi', 4), ('uThukela', 4),
  ('Zululand', 4);

-- Limpopo
INSERT INTO district_municipalities (name, province_id) VALUES
  ('Capricorn', 5), ('Mopani', 5), ('Sekhukhune', 5),
  ('Vhembe', 5), ('Waterberg', 5);

-- Mpumalanga
INSERT INTO district_municipalities (name, province_id) VALUES
  ('Ehlanzeni', 6), ('Gert Sibande', 6), ('Nkangala', 6);

-- North West
INSERT INTO district_municipalities (name, province_id) VALUES
  ('Bojanala Platinum', 7), ('Dr Kenneth Kaunda', 7),
  ('Dr Ruth Segomotsi Mompati', 7), ('Ngaka Modiri Molema', 7);

-- Northern Cape
INSERT INTO district_municipalities (name, province_id) VALUES
  ('Frances Baard', 8), ('John Taolo Gaetsewe', 8),
  ('Namakwa', 8), ('Pixley ka Seme', 8), ('ZF Mgcawu', 8);

-- Western Cape
INSERT INTO district_municipalities (name, province_id) VALUES
  ('Cape Winelands', 9), ('Central Karoo', 9), ('Garden Route', 9),
  ('Overberg', 9), ('West Coast', 9);

-- ============================================
-- SEED: METROPOLITAN MUNICIPALITIES
-- ============================================
INSERT INTO municipalities (name, municipality_type, province_id, aliases, submission_method, climate_zone, risk_flags) VALUES
  ('City of Cape Town', 'metropolitan', 9,
    ARRAY['Cape Town', 'Kaapstad', 'CBD', 'Table View', 'Bellville', 'Khayelitsha', 'Mitchells Plain', 'Muizenberg', 'Fish Hoek', 'Hout Bay', 'Constantia', 'Claremont', 'Rondebosch', 'Woodstock', 'Sea Point', 'Camps Bay', 'Milnerton', 'Bloubergstrand', 'Durbanville', 'Brackenfell', 'Goodwood', 'Parow', 'Somerset West', 'Strand', 'Gordons Bay'],
    'electronic', 4,
    '{"coastal": true, "heritage": true, "land_use_clearance": true}'::jsonb),

  ('City of Johannesburg', 'metropolitan', 3,
    ARRAY['Johannesburg', 'Joburg', 'JHB', 'Sandton', 'Randburg', 'Roodepoort', 'Soweto', 'Midrand', 'Fourways', 'Bryanston', 'Rosebank', 'Melrose', 'Parktown', 'Norwood', 'Orange Grove', 'Alexandra', 'Lenasia'],
    'electronic', 2,
    '{"heritage": true}'::jsonb),

  ('City of Tshwane', 'metropolitan', 3,
    ARRAY['Tshwane', 'Pretoria', 'PTA', 'Centurion', 'Midstream', 'Irene', 'Hatfield', 'Brooklyn', 'Menlyn', 'Garsfontein', 'Waterkloof', 'Lynnwood', 'Arcadia', 'Sunnyside', 'Mamelodi', 'Atteridgeville', 'Hammanskraal', 'Akasia', 'Montana'],
    'electronic', 2,
    '{"dolomite": true, "heritage": true}'::jsonb),

  ('eThekwini', 'metropolitan', 4,
    ARRAY['Durban', 'DBN', 'Umhlanga', 'Ballito', 'Pinetown', 'Chatsworth', 'Phoenix', 'Umlazi', 'Amanzimtoti', 'Westville', 'Hillcrest', 'Kloof', 'Berea', 'Morningside', 'La Lucia', 'Tongaat', 'Verulam', 'Shallcross'],
    'electronic', 3,
    '{"coastal": true, "heritage": true, "plan_validity_6_months": true}'::jsonb),

  ('Ekurhuleni', 'metropolitan', 3,
    ARRAY['Ekurhuleni', 'East Rand', 'Germiston', 'Boksburg', 'Benoni', 'Kempton Park', 'Edenvale', 'Bedfordview', 'Springs', 'Brakpan', 'Alberton', 'Nigel', 'OR Tambo Airport', 'Tembisa'],
    'electronic', 2,
    '{"dolomite": true, "heritage": true}'::jsonb),

  ('Nelson Mandela Bay', 'metropolitan', 1,
    ARRAY['Port Elizabeth', 'PE', 'Gqeberha', 'Uitenhage', 'Despatch', 'Colchester', 'Summerstrand', 'Walmer'],
    'both', 3,
    '{"coastal": true, "heritage": true}'::jsonb),

  ('Buffalo City', 'metropolitan', 1,
    ARRAY['East London', 'EL', 'King Williams Town', 'Bhisho', 'Mdantsane', 'Gonubie', 'Beacon Bay'],
    'counter', 3,
    '{"coastal": true, "heritage": true}'::jsonb),

  ('Mangaung', 'metropolitan', 2,
    ARRAY['Bloemfontein', 'Bloem', 'Botshabelo', 'Thaba Nchu'],
    'counter', 1,
    '{"heritage": true}'::jsonb);

-- ============================================
-- SEED: LOCAL MUNICIPALITIES (all 257)
-- ============================================

-- Eastern Cape - Alfred Nzo
INSERT INTO municipalities (name, municipality_type, district_id, province_id, aliases, submission_method, climate_zone, risk_flags) VALUES
  ('Matatiele', 'local', 1, 1, ARRAY['Matatiele', 'Maluti'], 'counter', 2, '{}'::jsonb),
  ('Mbizana', 'local', 1, 1, ARRAY['Mbizana', 'Bizana'], 'counter', 3, '{"coastal": true}'::jsonb),
  ('Ntabankulu', 'local', 1, 1, ARRAY['Ntabankulu'], 'counter', 2, '{}'::jsonb),
  ('Umzimvubu', 'local', 1, 1, ARRAY['Umzimvubu', 'Mount Frere', 'Mount Ayliff'], 'counter', 2, '{}'::jsonb);

-- Eastern Cape - Amathole
INSERT INTO municipalities (name, municipality_type, district_id, province_id, aliases, submission_method, climate_zone, risk_flags) VALUES
  ('Amahlathi', 'local', 2, 1, ARRAY['Amahlathi', 'Stutterheim', 'Cathcart'], 'counter', 2, '{}'::jsonb),
  ('Great Kei', 'local', 2, 1, ARRAY['Great Kei', 'Komani'], 'counter', 3, '{"coastal": true}'::jsonb),
  ('Mbhashe', 'local', 2, 1, ARRAY['Mbhashe', 'Idutywa', 'Willowvale', 'Elliotdale'], 'counter', 3, '{"coastal": true}'::jsonb),
  ('Mnquma', 'local', 2, 1, ARRAY['Mnquma', 'Butterworth', 'Ngqamakhwe', 'Centane'], 'counter', 3, '{}'::jsonb),
  ('Ngqushwa', 'local', 2, 1, ARRAY['Ngqushwa', 'Peddie', 'Hamburg'], 'counter', 3, '{"coastal": true}'::jsonb),
  ('Raymond Mhlaba', 'local', 2, 1, ARRAY['Raymond Mhlaba', 'Fort Beaufort', 'Alice', 'Adelaide'], 'counter', 2, '{"heritage": true}'::jsonb);

-- Eastern Cape - Chris Hani
INSERT INTO municipalities (name, municipality_type, district_id, province_id, aliases, submission_method, climate_zone, risk_flags) VALUES
  ('Emalahleni', 'local', 3, 1, ARRAY['Emalahleni EC', 'Lady Frere', 'Dordrecht'], 'counter', 2, '{}'::jsonb),
  ('Enoch Mgijima', 'local', 3, 1, ARRAY['Enoch Mgijima', 'Queenstown', 'Komani'], 'counter', 2, '{}'::jsonb),
  ('Engcobo', 'local', 3, 1, ARRAY['Engcobo', 'Ngcobo'], 'counter', 2, '{}'::jsonb),
  ('Intsika Yethu', 'local', 3, 1, ARRAY['Intsika Yethu', 'Cofimvaba'], 'counter', 2, '{}'::jsonb),
  ('Inxuba Yethemba', 'local', 3, 1, ARRAY['Inxuba Yethemba', 'Cradock', 'Middelburg EC'], 'counter', 1, '{}'::jsonb),
  ('Sakhisizwe', 'local', 3, 1, ARRAY['Sakhisizwe', 'Cala', 'Elliot'], 'counter', 2, '{}'::jsonb);

-- Eastern Cape - Joe Gqabi
INSERT INTO municipalities (name, municipality_type, district_id, province_id, aliases, submission_method, climate_zone, risk_flags) VALUES
  ('Elundini', 'local', 4, 1, ARRAY['Elundini', 'Maclear', 'Ugie', 'Mount Fletcher'], 'counter', 2, '{}'::jsonb),
  ('Senqu', 'local', 4, 1, ARRAY['Senqu', 'Lady Grey', 'Barkly East', 'Rhodes'], 'counter', 1, '{}'::jsonb),
  ('Walter Sisulu', 'local', 4, 1, ARRAY['Walter Sisulu', 'Aliwal North', 'Burgersdorp', 'Sterkspruit'], 'counter', 1, '{}'::jsonb);

-- Eastern Cape - O.R. Tambo
INSERT INTO municipalities (name, municipality_type, district_id, province_id, aliases, submission_method, climate_zone, risk_flags) VALUES
  ('Ingquza Hill', 'local', 5, 1, ARRAY['Ingquza Hill', 'Lusikisiki', 'Flagstaff'], 'counter', 3, '{"coastal": true}'::jsonb),
  ('King Sabata Dalindyebo', 'local', 5, 1, ARRAY['King Sabata Dalindyebo', 'Mthatha', 'Umtata'], 'counter', 3, '{}'::jsonb),
  ('Mhlontlo', 'local', 5, 1, ARRAY['Mhlontlo', 'Qumbu', 'Tsolo'], 'counter', 2, '{}'::jsonb),
  ('Nyandeni', 'local', 5, 1, ARRAY['Nyandeni', 'Libode', 'Ngqeleni'], 'counter', 3, '{"coastal": true}'::jsonb),
  ('Port St Johns', 'local', 5, 1, ARRAY['Port St Johns'], 'counter', 3, '{"coastal": true}'::jsonb);

-- Eastern Cape - Sarah Baartman
INSERT INTO municipalities (name, municipality_type, district_id, province_id, aliases, submission_method, climate_zone, risk_flags) VALUES
  ('Blue Crane Route', 'local', 6, 1, ARRAY['Blue Crane Route', 'Somerset East', 'Cookhouse', 'Pearston'], 'counter', 1, '{}'::jsonb),
  ('Dr Beyers Naude', 'local', 6, 1, ARRAY['Dr Beyers Naude', 'Graaff-Reinet', 'Nieu-Bethesda', 'Aberdeen'], 'counter', 1, '{"heritage": true}'::jsonb),
  ('Kouga', 'local', 6, 1, ARRAY['Kouga', 'Jeffreys Bay', 'Humansdorp', 'St Francis Bay', 'Cape St Francis'], 'counter', 3, '{"coastal": true}'::jsonb),
  ('Koukamma', 'local', 6, 1, ARRAY['Koukamma', 'Storms River', 'Joubertina', 'Kareedouw'], 'counter', 3, '{"coastal": true}'::jsonb),
  ('Makana', 'local', 6, 1, ARRAY['Makana', 'Grahamstown', 'Makhanda', 'Riebeeck East'], 'counter', 2, '{"heritage": true}'::jsonb),
  ('Ndlambe', 'local', 6, 1, ARRAY['Ndlambe', 'Port Alfred', 'Kenton-on-Sea', 'Alexandria', 'Bathurst'], 'counter', 3, '{"coastal": true}'::jsonb),
  ('Sundays River Valley', 'local', 6, 1, ARRAY['Sundays River Valley', 'Addo', 'Kirkwood'], 'counter', 2, '{}'::jsonb);

-- Free State - Fezile Dabi
INSERT INTO municipalities (name, municipality_type, district_id, province_id, aliases, submission_method, climate_zone, risk_flags) VALUES
  ('Moqhaka', 'local', 7, 2, ARRAY['Moqhaka', 'Kroonstad', 'Steynsrus', 'Viljoenskroon'], 'counter', 1, '{}'::jsonb),
  ('Ngwathe', 'local', 7, 2, ARRAY['Ngwathe', 'Parys', 'Vredefort', 'Heilbron', 'Koppies'], 'counter', 1, '{}'::jsonb),
  ('Metsimaholo', 'local', 7, 2, ARRAY['Metsimaholo', 'Sasolburg', 'Deneysville', 'Oranjeville'], 'counter', 2, '{}'::jsonb),
  ('Mafube', 'local', 7, 2, ARRAY['Mafube', 'Frankfort', 'Villiers', 'Cornelia'], 'counter', 1, '{}'::jsonb);

-- Free State - Lejweleputswa
INSERT INTO municipalities (name, municipality_type, district_id, province_id, aliases, submission_method, climate_zone, risk_flags) VALUES
  ('Matjhabeng', 'local', 8, 2, ARRAY['Matjhabeng', 'Welkom', 'Virginia', 'Odendaalsrus', 'Hennenman'], 'counter', 1, '{}'::jsonb),
  ('Nala', 'local', 8, 2, ARRAY['Nala', 'Bothaville', 'Wesselsbron'], 'counter', 1, '{}'::jsonb),
  ('Tokologo', 'local', 8, 2, ARRAY['Tokologo', 'Boshof', 'Dealesville', 'Hertzogville'], 'counter', 1, '{}'::jsonb),
  ('Tswelopele', 'local', 8, 2, ARRAY['Tswelopele', 'Hoopstad', 'Bultfontein'], 'counter', 1, '{}'::jsonb),
  ('Masilonyana', 'local', 8, 2, ARRAY['Masilonyana', 'Brandfort', 'Winburg', 'Theunissen'], 'counter', 1, '{}'::jsonb);

-- Free State - Thabo Mofutsanyana
INSERT INTO municipalities (name, municipality_type, district_id, province_id, aliases, submission_method, climate_zone, risk_flags) VALUES
  ('Dihlabeng', 'local', 9, 2, ARRAY['Dihlabeng', 'Bethlehem', 'Clarens', 'Fouriesburg', 'Paul Roux'], 'counter', 1, '{}'::jsonb),
  ('Maluti-a-Phofung', 'local', 9, 2, ARRAY['Maluti-a-Phofung', 'Harrismith', 'Phuthaditjhaba', 'QwaQwa', 'Kestell'], 'counter', 2, '{}'::jsonb),
  ('Mantsopa', 'local', 9, 2, ARRAY['Mantsopa', 'Ladybrand', 'Ficksburg', 'Tweespruit'], 'counter', 1, '{}'::jsonb),
  ('Nketoana', 'local', 9, 2, ARRAY['Nketoana', 'Reitz', 'Petrus Steyn', 'Lindley'], 'counter', 1, '{}'::jsonb),
  ('Phumelela', 'local', 9, 2, ARRAY['Phumelela', 'Vrede', 'Memel', 'Warden'], 'counter', 1, '{}'::jsonb),
  ('Setsoto', 'local', 9, 2, ARRAY['Setsoto', 'Ficksburg', 'Clocolan', 'Senekal', 'Marquard'], 'counter', 1, '{}'::jsonb);

-- Free State - Xhariep
INSERT INTO municipalities (name, municipality_type, district_id, province_id, aliases, submission_method, climate_zone, risk_flags) VALUES
  ('Kopanong', 'local', 10, 2, ARRAY['Kopanong', 'Trompsburg', 'Springfontein', 'Bethulie', 'Philippolis', 'Jagersfontein'], 'counter', 1, '{}'::jsonb),
  ('Letsemeng', 'local', 10, 2, ARRAY['Letsemeng', 'Koffiefontein', 'Jacobsdal', 'Petrusburg', 'Luckhoff'], 'counter', 1, '{}'::jsonb),
  ('Mohokare', 'local', 10, 2, ARRAY['Mohokare', 'Zastron', 'Smithfield', 'Rouxville'], 'counter', 1, '{}'::jsonb);

-- Gauteng - Sedibeng
INSERT INTO municipalities (name, municipality_type, district_id, province_id, aliases, submission_method, climate_zone, risk_flags) VALUES
  ('Emfuleni', 'local', 11, 3, ARRAY['Emfuleni', 'Vanderbijlpark', 'Vereeniging', 'Meyerton', 'Sharpeville'], 'both', 2, '{}'::jsonb),
  ('Lesedi', 'local', 11, 3, ARRAY['Lesedi', 'Heidelberg GP', 'Ratanda', 'Devon'], 'counter', 2, '{}'::jsonb),
  ('Midvaal', 'local', 11, 3, ARRAY['Midvaal', 'Meyerton', 'De Deur', 'Walkerville'], 'both', 2, '{}'::jsonb);

-- Gauteng - West Rand
INSERT INTO municipalities (name, municipality_type, district_id, province_id, aliases, submission_method, climate_zone, risk_flags) VALUES
  ('Merafong City', 'local', 12, 3, ARRAY['Merafong City', 'Carletonville', 'Fochville', 'Khutsong', 'Wedela'], 'counter', 2, '{"dolomite": true}'::jsonb),
  ('Mogale City', 'local', 12, 3, ARRAY['Mogale City', 'Krugersdorp', 'Magaliesburg', 'Muldersdrift', 'Lanseria'], 'both', 2, '{"dolomite": true, "heritage": true}'::jsonb),
  ('Rand West City', 'local', 12, 3, ARRAY['Rand West City', 'Randfontein', 'Westonaria'], 'counter', 2, '{"dolomite": true}'::jsonb);

-- KwaZulu-Natal - Amajuba
INSERT INTO municipalities (name, municipality_type, district_id, province_id, aliases, submission_method, climate_zone, risk_flags) VALUES
  ('Dannhauser', 'local', 13, 4, ARRAY['Dannhauser'], 'counter', 2, '{}'::jsonb),
  ('eMadlangeni', 'local', 13, 4, ARRAY['eMadlangeni', 'Utrecht'], 'counter', 2, '{}'::jsonb),
  ('Newcastle', 'local', 13, 4, ARRAY['Newcastle', 'Madadeni', 'Osizweni'], 'counter', 2, '{}'::jsonb);

-- KwaZulu-Natal - Harry Gwala
INSERT INTO municipalities (name, municipality_type, district_id, province_id, aliases, submission_method, climate_zone, risk_flags) VALUES
  ('Dr Nkosazana Dlamini-Zuma', 'local', 14, 4, ARRAY['Dr Nkosazana Dlamini-Zuma', 'Creighton', 'Ixopo', 'Underberg', 'Himeville'], 'counter', 2, '{}'::jsonb),
  ('Greater Kokstad', 'local', 14, 4, ARRAY['Greater Kokstad', 'Kokstad'], 'counter', 2, '{}'::jsonb),
  ('Ubuhlebezwe', 'local', 14, 4, ARRAY['Ubuhlebezwe', 'Ixopo'], 'counter', 2, '{}'::jsonb),
  ('Umzimkhulu', 'local', 14, 4, ARRAY['Umzimkhulu'], 'counter', 2, '{}'::jsonb);

-- KwaZulu-Natal - iLembe
INSERT INTO municipalities (name, municipality_type, district_id, province_id, aliases, submission_method, climate_zone, risk_flags) VALUES
  ('KwaDukuza', 'local', 15, 4, ARRAY['KwaDukuza', 'Stanger', 'Ballito', 'Salt Rock', 'Tinley Manor', 'Sheffield Beach', 'Shaka King Airport'], 'both', 3, '{"coastal": true, "lums": true}'::jsonb),
  ('Mandeni', 'local', 15, 4, ARRAY['Mandeni', 'Sundumbili'], 'counter', 3, '{"coastal": true}'::jsonb),
  ('Maphumulo', 'local', 15, 4, ARRAY['Maphumulo'], 'counter', 3, '{}'::jsonb),
  ('Ndwedwe', 'local', 15, 4, ARRAY['Ndwedwe'], 'counter', 3, '{}'::jsonb);

-- KwaZulu-Natal - King Cetshwayo
INSERT INTO municipalities (name, municipality_type, district_id, province_id, aliases, submission_method, climate_zone, risk_flags) VALUES
  ('City of uMhlathuze', 'local', 16, 4, ARRAY['uMhlathuze', 'Richards Bay', 'Empangeni', 'Esikhawini'], 'both', 3, '{"coastal": true}'::jsonb),
  ('Mthonjaneni', 'local', 16, 4, ARRAY['Mthonjaneni', 'Melmoth'], 'counter', 3, '{}'::jsonb),
  ('Nkandla', 'local', 16, 4, ARRAY['Nkandla'], 'counter', 3, '{}'::jsonb),
  ('uMfolozi', 'local', 16, 4, ARRAY['uMfolozi', 'KwaMbonambi'], 'counter', 3, '{"coastal": true}'::jsonb),
  ('uMlalazi', 'local', 16, 4, ARRAY['uMlalazi', 'Eshowe', 'Mtunzini', 'Gingindlovu'], 'counter', 3, '{"coastal": true}'::jsonb);

-- KwaZulu-Natal - Ugu
INSERT INTO municipalities (name, municipality_type, district_id, province_id, aliases, submission_method, climate_zone, risk_flags) VALUES
  ('Ray Nkonyeni', 'local', 17, 4, ARRAY['Ray Nkonyeni', 'Port Shepstone', 'Margate', 'Shelly Beach', 'Ramsgate', 'Southbroom', 'Uvongo', 'Hibberdene'], 'both', 3, '{"coastal": true}'::jsonb),
  ('Umdoni', 'local', 17, 4, ARRAY['Umdoni', 'Scottburgh', 'Park Rynie', 'Pennington', 'Kelso'], 'counter', 3, '{"coastal": true}'::jsonb),
  ('Umzumbe', 'local', 17, 4, ARRAY['Umzumbe', 'Turton'], 'counter', 3, '{"coastal": true}'::jsonb),
  ('uMuziwabantu', 'local', 17, 4, ARRAY['uMuziwabantu', 'Harding'], 'counter', 2, '{}'::jsonb);

-- KwaZulu-Natal - uMgungundlovu
INSERT INTO municipalities (name, municipality_type, district_id, province_id, aliases, submission_method, climate_zone, risk_flags) VALUES
  ('Msunduzi', 'local', 18, 4, ARRAY['Msunduzi', 'Pietermaritzburg', 'PMB', 'Edendale'], 'electronic', 3, '{"heritage": true}'::jsonb),
  ('Impendle', 'local', 18, 4, ARRAY['Impendle'], 'counter', 2, '{}'::jsonb),
  ('Mpofana', 'local', 18, 4, ARRAY['Mpofana', 'Mooi River'], 'counter', 2, '{}'::jsonb),
  ('Richmond', 'local', 18, 4, ARRAY['Richmond KZN'], 'counter', 2, '{}'::jsonb),
  ('uMngeni', 'local', 18, 4, ARRAY['uMngeni', 'Howick', 'Hilton', 'Nottingham Road'], 'counter', 2, '{}'::jsonb),
  ('uMshwathi', 'local', 18, 4, ARRAY['uMshwathi', 'New Hanover', 'Wartburg', 'Dalton', 'Cool Air'], 'counter', 3, '{}'::jsonb);

-- KwaZulu-Natal - uMkhanyakude
INSERT INTO municipalities (name, municipality_type, district_id, province_id, aliases, submission_method, climate_zone, risk_flags) VALUES
  ('Big Five Hlabisa', 'local', 19, 4, ARRAY['Big Five Hlabisa', 'Hlabisa', 'Hluhluwe', 'St Lucia'], 'counter', 3, '{"coastal": true}'::jsonb),
  ('Jozini', 'local', 19, 4, ARRAY['Jozini', 'Mkuze'], 'counter', 3, '{}'::jsonb),
  ('Mtubatuba', 'local', 19, 4, ARRAY['Mtubatuba', 'St Lucia'], 'counter', 3, '{"coastal": true}'::jsonb),
  ('uMhlabuyalingana', 'local', 19, 4, ARRAY['uMhlabuyalingana', 'Mbazwana', 'Sodwana Bay', 'Kosi Bay'], 'counter', 3, '{"coastal": true}'::jsonb);

-- KwaZulu-Natal - uMzinyathi
INSERT INTO municipalities (name, municipality_type, district_id, province_id, aliases, submission_method, climate_zone, risk_flags) VALUES
  ('Endumeni', 'local', 20, 4, ARRAY['Endumeni', 'Dundee'], 'counter', 2, '{"heritage": true}'::jsonb),
  ('Msinga', 'local', 20, 4, ARRAY['Msinga', 'Tugela Ferry', 'Pomeroy'], 'counter', 2, '{}'::jsonb),
  ('Nquthu', 'local', 20, 4, ARRAY['Nquthu'], 'counter', 2, '{"heritage": true}'::jsonb),
  ('Umvoti', 'local', 20, 4, ARRAY['Umvoti', 'Greytown'], 'counter', 2, '{}'::jsonb);

-- KwaZulu-Natal - uThukela
INSERT INTO municipalities (name, municipality_type, district_id, province_id, aliases, submission_method, climate_zone, risk_flags) VALUES
  ('Alfred Duma', 'local', 21, 4, ARRAY['Alfred Duma', 'Ladysmith', 'Ezakheni'], 'counter', 2, '{}'::jsonb),
  ('Inkosi Langalibalele', 'local', 21, 4, ARRAY['Inkosi Langalibalele', 'Estcourt', 'Weenen', 'Winterton'], 'counter', 2, '{}'::jsonb),
  ('Okhahlamba', 'local', 21, 4, ARRAY['Okhahlamba', 'Bergville', 'Drakensberg'], 'counter', 2, '{}'::jsonb);

-- KwaZulu-Natal - Zululand
INSERT INTO municipalities (name, municipality_type, district_id, province_id, aliases, submission_method, climate_zone, risk_flags) VALUES
  ('AbaQulusi', 'local', 22, 4, ARRAY['AbaQulusi', 'Vryheid'], 'counter', 2, '{}'::jsonb),
  ('eDumbe', 'local', 22, 4, ARRAY['eDumbe', 'Paulpietersburg'], 'counter', 2, '{}'::jsonb),
  ('Nongoma', 'local', 22, 4, ARRAY['Nongoma'], 'counter', 3, '{}'::jsonb),
  ('Ulundi', 'local', 22, 4, ARRAY['Ulundi'], 'counter', 3, '{"heritage": true}'::jsonb),
  ('uPhongolo', 'local', 22, 4, ARRAY['uPhongolo', 'Pongola'], 'counter', 3, '{}'::jsonb);

-- Limpopo - Capricorn
INSERT INTO municipalities (name, municipality_type, district_id, province_id, aliases, submission_method, climate_zone, risk_flags) VALUES
  ('Blouberg', 'local', 23, 5, ARRAY['Blouberg', 'Senwabarwana'], 'counter', 2, '{"communal_land": true}'::jsonb),
  ('Lepelle-Nkumpi', 'local', 23, 5, ARRAY['Lepelle-Nkumpi', 'Lebowakgomo'], 'counter', 2, '{"communal_land": true}'::jsonb),
  ('Molemole', 'local', 23, 5, ARRAY['Molemole', 'Mogwadi', 'Dendron'], 'counter', 2, '{"communal_land": true}'::jsonb),
  ('Polokwane', 'local', 23, 5, ARRAY['Polokwane', 'Pietersburg', 'Seshego', 'Bendor', 'Fauna Park'], 'both', 2, '{}'::jsonb);

-- Limpopo - Mopani
INSERT INTO municipalities (name, municipality_type, district_id, province_id, aliases, submission_method, climate_zone, risk_flags) VALUES
  ('Ba-Phalaborwa', 'local', 24, 5, ARRAY['Ba-Phalaborwa', 'Phalaborwa', 'Namakgale'], 'counter', 2, '{}'::jsonb),
  ('Greater Giyani', 'local', 24, 5, ARRAY['Greater Giyani', 'Giyani'], 'counter', 2, '{"communal_land": true}'::jsonb),
  ('Greater Letaba', 'local', 24, 5, ARRAY['Greater Letaba', 'Modjadjiskloof', 'Duiwelskloof', 'Ga-Kgapane'], 'counter', 2, '{"communal_land": true}'::jsonb),
  ('Greater Tzaneen', 'local', 24, 5, ARRAY['Greater Tzaneen', 'Tzaneen', 'Nkowankowa', 'Letsitele'], 'counter', 2, '{}'::jsonb),
  ('Maruleng', 'local', 24, 5, ARRAY['Maruleng', 'Hoedspruit', 'Klaserie'], 'counter', 2, '{}'::jsonb);

-- Limpopo - Sekhukhune
INSERT INTO municipalities (name, municipality_type, district_id, province_id, aliases, submission_method, climate_zone, risk_flags) VALUES
  ('Elias Motsoaledi', 'local', 25, 5, ARRAY['Elias Motsoaledi', 'Groblersdal', 'Marble Hall'], 'counter', 2, '{}'::jsonb),
  ('Ephraim Mogale', 'local', 25, 5, ARRAY['Ephraim Mogale', 'Marble Hall'], 'counter', 2, '{}'::jsonb),
  ('Fetakgomo Tubatse', 'local', 25, 5, ARRAY['Fetakgomo Tubatse', 'Burgersfort', 'Steelpoort'], 'counter', 2, '{}'::jsonb),
  ('Makhuduthamaga', 'local', 25, 5, ARRAY['Makhuduthamaga', 'Jane Furse'], 'counter', 2, '{"communal_land": true}'::jsonb);

-- Limpopo - Vhembe
INSERT INTO municipalities (name, municipality_type, district_id, province_id, aliases, submission_method, climate_zone, risk_flags) VALUES
  ('Collins Chabane', 'local', 26, 5, ARRAY['Collins Chabane', 'Malamulele', 'Saselamani'], 'counter', 2, '{"communal_land": true}'::jsonb),
  ('Makhado', 'local', 26, 5, ARRAY['Makhado', 'Louis Trichardt', 'Elim', 'Levubu', 'Dzanani'], 'counter', 2, '{}'::jsonb),
  ('Musina', 'local', 26, 5, ARRAY['Musina', 'Messina', 'Beitbridge Border'], 'counter', 2, '{}'::jsonb),
  ('Thulamela', 'local', 26, 5, ARRAY['Thulamela', 'Thohoyandou', 'Sibasa'], 'counter', 2, '{"communal_land": true}'::jsonb);

-- Limpopo - Waterberg
INSERT INTO municipalities (name, municipality_type, district_id, province_id, aliases, submission_method, climate_zone, risk_flags) VALUES
  ('Bela-Bela', 'local', 27, 5, ARRAY['Bela-Bela', 'Warmbaths', 'Warmbad'], 'counter', 2, '{}'::jsonb),
  ('Lephalale', 'local', 27, 5, ARRAY['Lephalale', 'Ellisras', 'Onverwacht'], 'counter', 2, '{}'::jsonb),
  ('Mogalakwena', 'local', 27, 5, ARRAY['Mogalakwena', 'Mokopane', 'Potgietersrus', 'Mahwelereng'], 'counter', 2, '{}'::jsonb),
  ('Modimolle-Mookgophong', 'local', 27, 5, ARRAY['Modimolle-Mookgophong', 'Modimolle', 'Nylstroom', 'Mookgophong', 'Naboomspruit'], 'counter', 2, '{}'::jsonb),
  ('Thabazimbi', 'local', 27, 5, ARRAY['Thabazimbi', 'Northam'], 'counter', 2, '{}'::jsonb);

-- Mpumalanga - Ehlanzeni
INSERT INTO municipalities (name, municipality_type, district_id, province_id, aliases, submission_method, climate_zone, risk_flags) VALUES
  ('Bushbuckridge', 'local', 28, 6, ARRAY['Bushbuckridge', 'Acornhoek', 'Hazyview'], 'counter', 2, '{"communal_land": true}'::jsonb),
  ('City of Mbombela', 'local', 28, 6, ARRAY['Mbombela', 'Nelspruit', 'White River', 'Hazyview', 'KaNyamazane', 'Barberton'], 'both', 2, '{}'::jsonb),
  ('Nkomazi', 'local', 28, 6, ARRAY['Nkomazi', 'Komatipoort', 'Malelane', 'Hectorspruit'], 'counter', 2, '{}'::jsonb),
  ('Thaba Chweu', 'local', 28, 6, ARRAY['Thaba Chweu', 'Lydenburg', 'Sabie', 'Graskop', 'Pilgrimsrest'], 'counter', 2, '{"heritage": true}'::jsonb);

-- Mpumalanga - Gert Sibande
INSERT INTO municipalities (name, municipality_type, district_id, province_id, aliases, submission_method, climate_zone, risk_flags) VALUES
  ('Chief Albert Luthuli', 'local', 29, 6, ARRAY['Chief Albert Luthuli', 'Carolina', 'Badplaas', 'Elukwatini'], 'counter', 2, '{}'::jsonb),
  ('Dipaleseng', 'local', 29, 6, ARRAY['Dipaleseng', 'Balfour', 'Greylingstad'], 'counter', 2, '{}'::jsonb),
  ('Govan Mbeki', 'local', 29, 6, ARRAY['Govan Mbeki', 'Secunda', 'Bethal', 'Trichardt', 'Leandra', 'Evander'], 'counter', 2, '{"spluma": true}'::jsonb),
  ('Lekwa', 'local', 29, 6, ARRAY['Lekwa', 'Standerton', 'Morgenzon'], 'counter', 2, '{}'::jsonb),
  ('Mkhondo', 'local', 29, 6, ARRAY['Mkhondo', 'Piet Retief', 'Amsterdam', 'Ermelo Area'], 'counter', 2, '{}'::jsonb),
  ('Msukaligwa', 'local', 29, 6, ARRAY['Msukaligwa', 'Ermelo', 'Breyten', 'Sheepmoor'], 'counter', 2, '{}'::jsonb),
  ('Pixley Ka Seme', 'local', 29, 6, ARRAY['Pixley Ka Seme MP', 'Volksrust', 'Amersfoort', 'Wakkerstroom'], 'counter', 2, '{}'::jsonb);

-- Mpumalanga - Nkangala
INSERT INTO municipalities (name, municipality_type, district_id, province_id, aliases, submission_method, climate_zone, risk_flags) VALUES
  ('Dr JS Moroka', 'local', 30, 6, ARRAY['Dr JS Moroka', 'Siyabuswa', 'Dennilton'], 'counter', 2, '{"communal_land": true}'::jsonb),
  ('Emalahleni MP', 'local', 30, 6, ARRAY['Emalahleni', 'Witbank', 'eMalahleni'], 'both', 2, '{"spluma": true}'::jsonb),
  ('Emakhazeni', 'local', 30, 6, ARRAY['Emakhazeni', 'Belfast', 'Dullstroom', 'Machadodorp', 'Waterval Boven'], 'counter', 2, '{}'::jsonb),
  ('Steve Tshwete', 'local', 30, 6, ARRAY['Steve Tshwete', 'Middelburg MP', 'Mhluzi', 'Hendrina', 'Komati'], 'both', 2, '{"spluma": true}'::jsonb),
  ('Thembisile Hani', 'local', 30, 6, ARRAY['Thembisile Hani', 'KwaMhlanga', 'Empumalanga'], 'counter', 2, '{"communal_land": true}'::jsonb),
  ('Victor Khanye', 'local', 30, 6, ARRAY['Victor Khanye', 'Delmas', 'Botleng'], 'counter', 2, '{}'::jsonb);

-- North West - Bojanala Platinum
INSERT INTO municipalities (name, municipality_type, district_id, province_id, aliases, submission_method, climate_zone, risk_flags) VALUES
  ('Kgetlengrivier', 'local', 31, 7, ARRAY['Kgetlengrivier', 'Rustenburg Area', 'Koster', 'Swartruggens'], 'counter', 2, '{}'::jsonb),
  ('Madibeng', 'local', 31, 7, ARRAY['Madibeng', 'Brits', 'Hartbeespoort', 'Lethabong', 'Odi'], 'both', 2, '{"dolomite": true}'::jsonb),
  ('Moretele', 'local', 31, 7, ARRAY['Moretele', 'Temba', 'Hammanskraal Area'], 'counter', 2, '{"communal_land": true}'::jsonb),
  ('Moses Kotane', 'local', 31, 7, ARRAY['Moses Kotane', 'Mogwase', 'Sun City', 'Pilanesberg', 'Moruleng'], 'counter', 2, '{"communal_land": true}'::jsonb),
  ('Rustenburg', 'local', 31, 7, ARRAY['Rustenburg', 'Phokeng', 'Tlhabane', 'Waterfall Mall'], 'both', 2, '{}'::jsonb);

-- North West - Dr Kenneth Kaunda
INSERT INTO municipalities (name, municipality_type, district_id, province_id, aliases, submission_method, climate_zone, risk_flags) VALUES
  ('City of Matlosana', 'local', 32, 7, ARRAY['Matlosana', 'Klerksdorp', 'Orkney', 'Stilfontein', 'Hartbeesfontein'], 'counter', 2, '{"dolomite": true}'::jsonb),
  ('JB Marks', 'local', 32, 7, ARRAY['JB Marks', 'Potchefstroom', 'Ventersdorp'], 'both', 2, '{}'::jsonb),
  ('Maquassi Hills', 'local', 32, 7, ARRAY['Maquassi Hills', 'Wolmaransstad', 'Leeudoringstad', 'Makwassie'], 'counter', 1, '{}'::jsonb);

-- North West - Dr Ruth Segomotsi Mompati
INSERT INTO municipalities (name, municipality_type, district_id, province_id, aliases, submission_method, climate_zone, risk_flags) VALUES
  ('Greater Taung', 'local', 33, 7, ARRAY['Greater Taung', 'Taung'], 'counter', 1, '{"communal_land": true}'::jsonb),
  ('Kagisano-Molopo', 'local', 33, 7, ARRAY['Kagisano-Molopo', 'Ganyesa', 'Pomfret'], 'counter', 1, '{}'::jsonb),
  ('Lekwa-Teemane', 'local', 33, 7, ARRAY['Lekwa-Teemane', 'Christiana', 'Bloemhof'], 'counter', 1, '{}'::jsonb),
  ('Mamusa', 'local', 33, 7, ARRAY['Mamusa', 'Schweizer-Reneke', 'Amalia'], 'counter', 1, '{}'::jsonb),
  ('Naledi NW', 'local', 33, 7, ARRAY['Naledi NW', 'Vryburg'], 'counter', 1, '{}'::jsonb);

-- North West - Ngaka Modiri Molema
INSERT INTO municipalities (name, municipality_type, district_id, province_id, aliases, submission_method, climate_zone, risk_flags) VALUES
  ('Ditsobotla', 'local', 34, 7, ARRAY['Ditsobotla', 'Lichtenburg', 'Coligny'], 'counter', 2, '{}'::jsonb),
  ('Mafikeng', 'local', 34, 7, ARRAY['Mafikeng', 'Mahikeng', 'Mmabatho'], 'counter', 2, '{"heritage": true}'::jsonb),
  ('Ramotshere Moiloa', 'local', 34, 7, ARRAY['Ramotshere Moiloa', 'Zeerust', 'Groot Marico'], 'counter', 2, '{}'::jsonb),
  ('Ratlou', 'local', 34, 7, ARRAY['Ratlou', 'Setlagole', 'Madibogo'], 'counter', 2, '{"communal_land": true}'::jsonb),
  ('Tswaing', 'local', 34, 7, ARRAY['Tswaing', 'Delareyville', 'Ottosdal', 'Sannieshof'], 'counter', 2, '{}'::jsonb);

-- Northern Cape - Frances Baard
INSERT INTO municipalities (name, municipality_type, district_id, province_id, aliases, submission_method, climate_zone, risk_flags) VALUES
  ('Dikgatlong', 'local', 35, 8, ARRAY['Dikgatlong', 'Barkly West', 'Windsorton', 'Delportshoop'], 'counter', 1, '{}'::jsonb),
  ('Magareng', 'local', 35, 8, ARRAY['Magareng', 'Warrenton'], 'counter', 1, '{}'::jsonb),
  ('Phokwane', 'local', 35, 8, ARRAY['Phokwane', 'Hartswater', 'Jan Kempdorp', 'Pampierstad'], 'counter', 1, '{}'::jsonb),
  ('Sol Plaatje', 'local', 35, 8, ARRAY['Sol Plaatje', 'Kimberley', 'Galeshewe', 'Riverton'], 'both', 1, '{"heritage": true}'::jsonb);

-- Northern Cape - John Taolo Gaetsewe
INSERT INTO municipalities (name, municipality_type, district_id, province_id, aliases, submission_method, climate_zone, risk_flags) VALUES
  ('Gamagara', 'local', 36, 8, ARRAY['Gamagara', 'Kathu', 'Sishen', 'Deben', 'Dibeng'], 'counter', 1, '{}'::jsonb),
  ('Ga-Segonyana', 'local', 36, 8, ARRAY['Ga-Segonyana', 'Kuruman', 'Mothibistad', 'Wrenchville'], 'counter', 1, '{}'::jsonb),
  ('Joe Morolong', 'local', 36, 8, ARRAY['Joe Morolong', 'Heuningvlei', 'Van Zylsrus', 'Hotazel'], 'counter', 1, '{}'::jsonb);

-- Northern Cape - Namakwa
INSERT INTO municipalities (name, municipality_type, district_id, province_id, aliases, submission_method, climate_zone, risk_flags) VALUES
  ('Hantam', 'local', 37, 8, ARRAY['Hantam', 'Calvinia', 'Brandvlei', 'Middelpos'], 'counter', 1, '{}'::jsonb),
  ('Kamiesberg', 'local', 37, 8, ARRAY['Kamiesberg', 'Garies', 'Kamieskroon', 'Hondeklipbaai'], 'counter', 1, '{"coastal": true}'::jsonb),
  ('Karoo Hoogland', 'local', 37, 8, ARRAY['Karoo Hoogland', 'Sutherland', 'Fraserburg'], 'counter', 1, '{}'::jsonb),
  ('Khai-Ma', 'local', 37, 8, ARRAY['Khai-Ma', 'Pofadder', 'Pella', 'Aggeneys'], 'counter', 1, '{}'::jsonb),
  ('Nama Khoi', 'local', 37, 8, ARRAY['Nama Khoi', 'Springbok', 'Nababeep', 'Okiep', 'Bergsig'], 'counter', 1, '{}'::jsonb),
  ('Richtersveld', 'local', 37, 8, ARRAY['Richtersveld', 'Port Nolloth', 'Alexander Bay', 'Sanddrift', 'Lekkersing'], 'counter', 1, '{"coastal": true, "heritage": true}'::jsonb);

-- Northern Cape - Pixley ka Seme
INSERT INTO municipalities (name, municipality_type, district_id, province_id, aliases, submission_method, climate_zone, risk_flags) VALUES
  ('Emthanjeni', 'local', 38, 8, ARRAY['Emthanjeni', 'De Aar', 'Hanover', 'Britstown'], 'counter', 1, '{}'::jsonb),
  ('Kareeberg', 'local', 38, 8, ARRAY['Kareeberg', 'Carnarvon', 'Vosburg', 'Vanwyksvlei'], 'counter', 1, '{}'::jsonb),
  ('Renosterberg', 'local', 38, 8, ARRAY['Renosterberg', 'Petrusville', 'Phillipstown', 'Vanderkloof'], 'counter', 1, '{}'::jsonb),
  ('Siyancuma', 'local', 38, 8, ARRAY['Siyancuma', 'Douglas', 'Griekwastad', 'Campbell'], 'counter', 1, '{}'::jsonb),
  ('Siyathemba', 'local', 38, 8, ARRAY['Siyathemba', 'Prieska', 'Marydale', 'Niekerkshoop'], 'counter', 1, '{}'::jsonb),
  ('Thembelihle', 'local', 38, 8, ARRAY['Thembelihle', 'Hopetown', 'Strydenburg', 'Orania'], 'counter', 1, '{}'::jsonb),
  ('Ubuntu', 'local', 38, 8, ARRAY['Ubuntu', 'Victoria West', 'Loxton', 'Richmond NC', 'Three Sisters'], 'counter', 1, '{}'::jsonb),
  ('Umsobomvu', 'local', 38, 8, ARRAY['Umsobomvu', 'Colesberg', 'Norvalspont'], 'counter', 1, '{}'::jsonb);

-- Northern Cape - ZF Mgcawu
INSERT INTO municipalities (name, municipality_type, district_id, province_id, aliases, submission_method, climate_zone, risk_flags) VALUES
  ('Dawid Kruiper', 'local', 39, 8, ARRAY['Dawid Kruiper', 'Upington', 'Keimoes', 'Kakamas', 'Augrabies'], 'counter', 1, '{}'::jsonb),
  ('Kai !Garib', 'local', 39, 8, ARRAY['Kai !Garib', 'Kakamas', 'Kenhardt', 'Brandvlei NC'], 'counter', 1, '{}'::jsonb),
  ('Kgatelopele', 'local', 39, 8, ARRAY['Kgatelopele', 'Danielskuil', 'Lime Acres', 'Postmasburg Area'], 'counter', 1, '{}'::jsonb),
  ('Tsantsabane', 'local', 39, 8, ARRAY['Tsantsabane', 'Postmasburg', 'Groenwater', 'Beeshoek'], 'counter', 1, '{}'::jsonb),
  ('!Kheis', 'local', 39, 8, ARRAY['!Kheis', 'Groblershoop', 'Wegdraai'], 'counter', 1, '{}'::jsonb);

-- Western Cape - Cape Winelands
INSERT INTO municipalities (name, municipality_type, district_id, province_id, aliases, submission_method, climate_zone, risk_flags) VALUES
  ('Breede Valley', 'local', 40, 9, ARRAY['Breede Valley', 'Worcester', 'De Doorns', 'Rawsonville', 'Touwsrivier'], 'both', 4, '{}'::jsonb),
  ('Drakenstein', 'local', 40, 9, ARRAY['Drakenstein', 'Paarl', 'Wellington', 'Franschhoek', 'Simondium', 'Klapmuts'], 'electronic', 4, '{"heritage": true}'::jsonb),
  ('Langeberg', 'local', 40, 9, ARRAY['Langeberg', 'Robertson', 'Ashton', 'Bonnievale', 'Montagu', 'McGregor'], 'both', 4, '{}'::jsonb),
  ('Stellenbosch', 'local', 40, 9, ARRAY['Stellenbosch', 'Franschhoek Area', 'Kayamandi', 'Kylemore', 'Jamestown'], 'electronic', 4, '{"heritage": true}'::jsonb),
  ('Witzenberg', 'local', 40, 9, ARRAY['Witzenberg', 'Ceres', 'Tulbagh', 'Wolseley', 'Op-die-Berg', 'Prince Alfred Hamlet'], 'both', 4, '{}'::jsonb);

-- Western Cape - Central Karoo
INSERT INTO municipalities (name, municipality_type, district_id, province_id, aliases, submission_method, climate_zone, risk_flags) VALUES
  ('Beaufort West', 'local', 41, 9, ARRAY['Beaufort West', 'Nelspoort', 'Merweville'], 'counter', 1, '{}'::jsonb),
  ('Laingsburg', 'local', 41, 9, ARRAY['Laingsburg', 'Matjiesfontein'], 'counter', 1, '{"heritage": true}'::jsonb),
  ('Prince Albert', 'local', 41, 9, ARRAY['Prince Albert', 'Klaarstroom', 'Leeu-Gamka'], 'counter', 1, '{"heritage": true}'::jsonb);

-- Western Cape - Garden Route
INSERT INTO municipalities (name, municipality_type, district_id, province_id, aliases, submission_method, climate_zone, risk_flags) VALUES
  ('Bitou', 'local', 42, 9, ARRAY['Bitou', 'Plettenberg Bay', 'Plett', 'Keurboomstrand', 'Nature''s Valley'], 'both', 4, '{"coastal": true, "heritage": true}'::jsonb),
  ('George', 'local', 42, 9, ARRAY['George', 'Wilderness', 'Pacaltsdorp', 'Herolds Bay', 'Victoria Bay'], 'electronic', 4, '{"coastal": true}'::jsonb),
  ('Hessequa', 'local', 42, 9, ARRAY['Hessequa', 'Riversdale', 'Stilbaai', 'Witsand', 'Heidelberg WC', 'Albertinia'], 'both', 4, '{"coastal": true}'::jsonb),
  ('Kannaland', 'local', 42, 9, ARRAY['Kannaland', 'Oudtshoorn', 'Calitzdorp', 'De Rust', 'Zoar'], 'counter', 1, '{}'::jsonb),
  ('Knysna', 'local', 42, 9, ARRAY['Knysna', 'Sedgefield', 'Belvidere', 'Brenton-on-Sea', 'Rheenendal'], 'electronic', 4, '{"coastal": true, "wildfire_risk": true, "heritage": true}'::jsonb),
  ('Mossel Bay', 'local', 42, 9, ARRAY['Mossel Bay', 'Hartenbos', 'Dana Bay', 'Groot Brakrivier', 'Klein Brakrivier', 'Reebok'], 'both', 4, '{"coastal": true}'::jsonb);

-- Western Cape - Overberg
INSERT INTO municipalities (name, municipality_type, district_id, province_id, aliases, submission_method, climate_zone, risk_flags) VALUES
  ('Cape Agulhas', 'local', 43, 9, ARRAY['Cape Agulhas', 'Bredasdorp', 'Arniston', 'Struisbaai', 'Elim', 'Agulhas', 'Napier'], 'both', 4, '{"coastal": true}'::jsonb),
  ('Overstrand', 'local', 43, 9, ARRAY['Overstrand', 'Hermanus', 'Kleinmond', 'Betty''s Bay', 'Stanford', 'Gansbaai', 'De Kelders', 'Onrus'], 'electronic', 4, '{"coastal": true, "heritage": true}'::jsonb),
  ('Swellendam', 'local', 43, 9, ARRAY['Swellendam', 'Barrydale', 'Suurbraak', 'Buffelsjag'], 'counter', 4, '{"heritage": true}'::jsonb),
  ('Theewaterskloof', 'local', 43, 9, ARRAY['Theewaterskloof', 'Caledon', 'Grabouw', 'Villiersdorp', 'Genadendal', 'Bot River', 'Riviersonderend'], 'both', 4, '{}'::jsonb);

-- Western Cape - West Coast
INSERT INTO municipalities (name, municipality_type, district_id, province_id, aliases, submission_method, climate_zone, risk_flags) VALUES
  ('Bergrivier', 'local', 44, 9, ARRAY['Bergrivier', 'Piketberg', 'Velddrif', 'Port Owen', 'Porterville', 'Eendekuil', 'Aurora'], 'electronic', 4, '{"coastal": true}'::jsonb),
  ('Cederberg', 'local', 44, 9, ARRAY['Cederberg', 'Citrusdal', 'Clanwilliam', 'Graafwater', 'Wupperthal', 'Algeria'], 'counter', 4, '{"heritage": true}'::jsonb),
  ('Matzikama', 'local', 44, 9, ARRAY['Matzikama', 'Vredendal', 'Vanrhynsdorp', 'Klawer', 'Lutzville', 'Strandfontein WC', 'Doringbaai'], 'counter', 4, '{"coastal": true}'::jsonb),
  ('Saldanha Bay', 'local', 44, 9, ARRAY['Saldanha Bay', 'Saldanha', 'Langebaan', 'Vredenburg', 'Paternoster', 'St Helena Bay', 'Jacobsbaai'], 'both', 4, '{"coastal": true}'::jsonb),
  ('Swartland', 'local', 44, 9, ARRAY['Swartland', 'Malmesbury', 'Darling', 'Moorreesburg', 'Riebeek Kasteel', 'Riebeek West', 'Yzerfontein', 'Koringberg'], 'both', 4, '{}'::jsonb);

-- ============================================
-- SEED: RISK FLAG DEFINITIONS
-- ============================================
INSERT INTO risk_flag_definitions (code, name, description, requirements, administering_authority, typical_timeframe, info_url, conditions) VALUES
  ('dolomite', 'Dolomite Risk Zone', 'The property is located in a known dolomite risk area. Dolomite geology can cause sinkholes and ground instability, requiring special geotechnical investigation before construction.', 'Geotechnical investigation report (DIGS report) required. Foundation design must comply with NHBRC guidelines for dolomite areas. Competent Person report on dolomite stability.', 'Council for Geoscience / Municipality', '4-8 weeks for geotechnical report', NULL, '{"municipality_flag": "dolomite"}'::jsonb),

  ('coastal_nemicma', 'Coastal Zone (NEM:ICMA)', 'The property falls within the coastal zone as defined by the National Environmental Management: Integrated Coastal Management Act. Additional environmental approvals may be required.', 'Coastal set-back line compliance. Possible EIA (Environmental Impact Assessment) required. Coastal development permit from provincial environmental authority.', 'Department of Environment, Forestry and Fisheries / Provincial Environmental Authority', '3-12 months for environmental authorisation', NULL, '{"municipality_flag": "coastal"}'::jsonb),

  ('heritage_sahra', 'Heritage (SAHRA)', 'The property or existing structures may have heritage significance requiring approval from the South African Heritage Resources Agency before any alterations or demolitions.', 'Heritage Impact Assessment (HIA) if structure is older than 60 years. SAHRA Section 34 permit for any alterations to structures older than 60 years. Possible archaeological assessment.', 'South African Heritage Resources Agency (SAHRA)', '6-12 weeks for SAHRA permit', 'https://sahris.sahra.org.za', '{"project_flag": "is_heritage"}'::jsonb),

  ('heritage_amafa', 'Heritage (Amafa aKwaZulu-Natali)', 'In KwaZulu-Natal, heritage matters are administered by Amafa aKwaZulu-Natali (KZN Heritage Council) rather than SAHRA for provincial heritage resources.', 'Heritage Impact Assessment (HIA). Amafa permit for structures older than 60 years. Archaeological assessment if required.', 'Amafa aKwaZulu-Natali (KZN Heritage Council)', '6-12 weeks', NULL, '{"province": "KZN", "project_flag": "is_heritage"}'::jsonb),

  ('lums_clearance', 'LUMS Clearance (KZN)', 'KwaZulu-Natal municipalities require Land Use Management Scheme clearance certificates before building plan approval.', 'LUMS clearance certificate from the municipality. Zoning compliance confirmation. Land use rights verification.', 'Municipal Planning Department', '2-4 weeks', NULL, '{"municipality_flag": "lums"}'::jsonb),

  ('land_use_clearance', 'Land Use Clearance (Cape Town)', 'City of Cape Town requires a Development Management (Land Use) clearance before building plan approval for certain development types.', 'Land Use clearance application. Development Management approval. Zoning compliance certificate.', 'City of Cape Town Development Management', '4-8 weeks', NULL, '{"municipality_flag": "land_use_clearance"}'::jsonb),

  ('spluma_certificate', 'SPLUMA Certificate', 'Certain Mpumalanga municipalities require a SPLUMA (Spatial Planning and Land Use Management Act) certificate before building plan submission.', 'SPLUMA certificate application. Land use rights confirmation. Municipal planning department approval.', 'Municipal Planning Tribunal', '4-12 weeks', NULL, '{"municipality_flag": "spluma"}'::jsonb),

  ('communal_land', 'Communal/Tribal Land', 'The property is on communal or tribal land, which involves additional approval processes through traditional authorities and the Department of Rural Development.', 'Permission to Occupy (PTO) or Deed of Grant. Traditional Authority consent letter. Department of Rural Development approval. Survey General diagram.', 'Traditional Authority / Department of Rural Development and Land Reform', '4-16 weeks', NULL, '{"municipality_flag": "communal_land"}'::jsonb),

  ('flood_line', 'Flood Line Risk', 'The property may be affected by a 1:50 year or 1:100 year flood line, restricting buildable area and requiring flood line determination.', 'Flood line determination by a professional engineer. No habitable rooms below the 1:100 year flood line. Stormwater management plan may be required.', 'Municipality / Professional Engineer', '2-4 weeks for flood line report', NULL, '{"project_flag": "is_flood_zone"}'::jsonb),

  ('wildfire_risk', 'Wildfire Risk Zone', 'The property is in a known wildfire risk area. Additional fire protection measures and clearance requirements may apply.', 'Fire Protection Plan. Vegetation clearance around structures. Fire-resistant building materials specification. Compliance with local fire by-laws.', 'Municipality Fire Department / FPA (Fire Protection Association)', '2-4 weeks', NULL, '{"municipality_flag": "wildfire_risk"}'::jsonb),

  ('plan_validity_6_months', 'eThekwini 6-Month Plan Validity', 'eThekwini Metropolitan Municipality has a shorter plan validity period of 6 months instead of the standard 12 months. Plans must be submitted within 6 months of approval.', 'Ensure submission within 6-month window. Apply for extension before lapse if needed.', 'eThekwini Building Control', 'N/A', NULL, '{"municipality_flag": "plan_validity_6_months"}'::jsonb);

-- ============================================
-- SEED: NATIONAL COMPLIANCE RULES (baseline)
-- ============================================

-- Administrative
INSERT INTO compliance_rules (category, name, description, why_applicable, source_legislation, where_to_obtain, conditions, is_conditional, trigger_label, sort_order) VALUES
  ('administrative', 'Building Plan Application Form', 'Completed official application form for building plan approval.', 'Required for all building plan submissions nationally.', 'NBR Act 103/1977, Section 4(1)', 'Municipal Building Control office or online portal', '{}', false, NULL, 1),
  ('administrative', 'Application Fee Payment', 'Proof of payment of the applicable building plan scrutiny fee.', 'Required for all building plan submissions.', 'NBR Act 103/1977', 'Municipal cashier or online payment portal', '{}', false, NULL, 2),
  ('administrative', 'Letter of Appointment', 'Letter confirming the appointment of a competent person to prepare and submit the building plans.', 'Required to confirm professional accountability.', 'NBR Act 103/1977, Section 4', 'Prepared by the appointed architectural professional', '{}', false, NULL, 3),
  ('administrative', 'SACAP Professional Registration Certificate', 'Current registration certificate of the architectural professional preparing the plans.', 'Required to verify the professional is registered and authorised.', 'Architectural Profession Act 44/2000', 'SACAP website or office', '{}', false, NULL, 4);

-- Ownership & Property
INSERT INTO compliance_rules (category, name, description, why_applicable, source_legislation, where_to_obtain, conditions, is_conditional, trigger_label, sort_order) VALUES
  ('ownership_property', 'Title Deed (Certified Copy)', 'Certified copy of the title deed for the property.', 'Required to confirm property ownership and any conditions/restrictions.', 'NBR Act 103/1977, Section 4(1)', 'Deeds Office or conveyancing attorney', '{}', false, NULL, 1),
  ('ownership_property', 'SG Diagram / Survey Plan', 'Surveyor General diagram showing the erf boundaries and dimensions.', 'Required to verify property boundaries and confirm building line compliance.', 'Land Survey Act 8/1997', 'Surveyor General Office or land surveyor', '{}', false, NULL, 2),
  ('ownership_property', 'Zoning Certificate', 'Certificate confirming the current zoning of the property.', 'Required to verify the intended use complies with zoning rights.', 'SPLUMA / Municipal Planning By-laws', 'Municipal Planning Department', '{}', false, NULL, 3),
  ('ownership_property', 'Rates Clearance Certificate', 'Certificate confirming municipal rates and taxes are paid up to date.', 'Many municipalities require rates clearance before accepting building plans.', 'Municipal By-laws', 'Municipal Finance Department', '{}', false, NULL, 4),
  ('ownership_property', 'Power of Attorney (if applicable)', 'Power of attorney from the property owner authorising the applicant to submit on their behalf.', 'Required when the applicant is not the registered property owner.', 'NBR Act 103/1977', 'Prepared by owner and applicant', '{}', false, NULL, 5),
  ('ownership_property', 'Body Corporate Approval', 'Written consent from the Body Corporate or Trustees for building works on sectional title property.', 'Required for all works on sectional title properties.', 'Sectional Titles Schemes Management Act 8/2011', 'Body Corporate of the sectional title scheme', '{"project_flag": "is_sectional_title"}', true, 'Sectional title property', 6),
  ('ownership_property', 'HOA Approval', 'Written approval from the Home Owners Association if the property is within an estate or managed community.', 'Required where applicable.', 'HOA Constitution', 'HOA management office', '{}', false, NULL, 7);

-- Professional Appointments
INSERT INTO compliance_rules (category, name, description, why_applicable, source_legislation, where_to_obtain, conditions, is_conditional, trigger_label, sort_order) VALUES
  ('professional_appointments', 'Structural Engineer Appointment', 'Appointment of a structural engineer registered with ECSA for structural design and certification.', 'Required for all structures requiring structural design.', 'SANS 10400-B, Engineering Profession Act', 'ECSA registered structural engineer', '{}', false, NULL, 1),
  ('professional_appointments', 'Civil Engineer Appointment', 'Appointment of a civil engineer for civil works design (stormwater, roads, services).', 'Required for developments involving civil infrastructure.', 'Engineering Profession Act 46/2000', 'ECSA registered civil engineer', '{}', false, NULL, 2),
  ('professional_appointments', 'Geotechnical Engineer Appointment', 'Appointment of a geotechnical engineer for foundation design on dolomite or unstable ground.', 'Required for properties in dolomite risk zones or requiring special foundations.', 'SANS 10400-B, NHBRC Guidelines', 'ECSA registered geotechnical engineer', '{"project_flag": "is_dolomite_zone"}', true, 'Dolomite risk zone', 3),
  ('professional_appointments', 'Land Surveyor', 'Appointment of a registered land surveyor for boundary verification and/or as-built surveys.', 'Required for all new builds and where building lines are close to boundaries.', 'Land Survey Act 8/1997', 'PLATO registered land surveyor', '{}', false, NULL, 4);

-- Drawing Set
INSERT INTO compliance_rules (category, name, description, why_applicable, source_legislation, where_to_obtain, conditions, is_conditional, trigger_label, sort_order) VALUES
  ('drawing_set', 'Site Plan', 'A site plan showing the erf boundaries, proposed building footprint, setbacks from all boundaries, existing structures, services, access points, and north point.', 'Required for all building plan submissions.', 'NBR Act 103/1977, SANS 10400-A', 'Prepared by the appointed architectural professional', '{}', false, NULL, 1),
  ('drawing_set', 'Floor Plans (All Levels)', 'Floor plans for every level of the building showing room layouts, dimensions, door/window positions, and wall thicknesses.', 'Required for all building plan submissions.', 'NBR Act 103/1977, SANS 10400-A', 'Prepared by the appointed architectural professional', '{}', false, NULL, 2),
  ('drawing_set', 'External Elevations (All 4)', 'All four external elevations (North, South, East, West) showing heights, roof pitch, window positions, and material finishes.', 'Required for all building plan submissions.', 'NBR Act 103/1977, SANS 10400-A', 'Prepared by the appointed architectural professional', '{}', false, NULL, 3),
  ('drawing_set', 'Sections (Min. 2)', 'At least two cross-sections through the building showing foundation depth, floor levels, ceiling heights, roof structure, and internal heights.', 'Required for all building plan submissions.', 'NBR Act 103/1977, SANS 10400-A', 'Prepared by the appointed architectural professional', '{}', false, NULL, 4),
  ('drawing_set', 'Roof Plan', 'Plan view of the roof showing ridge lines, valleys, hips, gutters, downpipes, solar panels, and roof material specification.', 'Required for all building plan submissions.', 'NBR Act 103/1977', 'Prepared by the appointed architectural professional', '{}', false, NULL, 5),
  ('drawing_set', 'Foundation Plan', 'Foundation layout plan with dimensions, reinforcement details, and reference to structural engineer certification.', 'Required for all new buildings and extensions.', 'SANS 10400-B, SANS 10400-H', 'Prepared by structural engineer', '{}', false, NULL, 6),
  ('drawing_set', 'Drainage / Plumbing Plan', 'Site drainage plan showing sewer connections, stormwater drainage, and internal plumbing layout.', 'Required for all buildings with plumbing and drainage.', 'SANS 10400-P, SANS 10252', 'Prepared by architectural professional or plumber', '{}', false, NULL, 7);

-- Energy & Environmental
INSERT INTO compliance_rules (category, name, description, why_applicable, source_legislation, where_to_obtain, conditions, is_conditional, trigger_label, sort_order) VALUES
  ('energy_environmental', 'Energy Efficiency Compliance (SANS 10400-XA)', 'Energy usage in buildings schedule demonstrating compliance with SANS 10400-XA requirements including fenestration, insulation, and hot water system.', 'Required for all new buildings and major alterations.', 'SANS 10400-XA', 'Prepared by architectural professional using prescriptive or rational design method', '{}', false, NULL, 1),
  ('energy_environmental', 'Hot Water System Compliance', 'Specification of hot water system showing at least 50% of annual heating energy from renewable sources (solar or heat pump).', 'Required for all new buildings with hot water installations.', 'SANS 10400-XA, Section 4.4', 'Solar installer or architectural professional', '{}', false, NULL, 2),
  ('energy_environmental', 'EIA Record of Decision', 'Environmental Impact Assessment Record of Decision from the provincial environmental authority.', 'Required for developments triggering listed activities under NEMA.', 'National Environmental Management Act 107/1998', 'Environmental Assessment Practitioner (EAP)', '{"project_flag": "is_coastal"}', true, 'Coastal zone or environmentally sensitive area', 3);

-- Engineering & Structural
INSERT INTO compliance_rules (category, name, description, why_applicable, source_legislation, where_to_obtain, conditions, is_conditional, trigger_label, sort_order) VALUES
  ('engineering_structural', 'Structural Engineers Report & Drawings', 'Structural design report and drawings certified by a registered structural engineer.', 'Required for all structures requiring structural design.', 'SANS 10400-B, SANS 10160', 'ECSA registered structural engineer', '{}', false, NULL, 1),
  ('engineering_structural', 'Geotechnical Investigation Report', 'Geotechnical investigation report for foundation design on dolomite or problem soils.', 'Required for properties in dolomite risk zones.', 'SANS 10400-B, NHBRC Guidelines', 'ECSA registered geotechnical engineer', '{"project_flag": "is_dolomite_zone"}', true, 'Dolomite risk zone', 2),
  ('engineering_structural', 'Rational Fire Design (if applicable)', 'Fire protection engineering report for buildings not complying with the deemed-to-satisfy rules.', 'Required for commercial and multi-storey buildings where rational design is used.', 'SANS 10400-T', 'Fire protection engineer', '{}', false, NULL, 3);

-- Special Conditions
INSERT INTO compliance_rules (category, name, description, why_applicable, source_legislation, where_to_obtain, conditions, is_conditional, trigger_label, sort_order) VALUES
  ('special_conditions', 'Heritage Impact Assessment', 'Heritage Impact Assessment report for structures older than 60 years or in heritage areas.', 'Required when altering or demolishing any structure older than 60 years.', 'National Heritage Resources Act 25/1999, Section 34', 'Heritage consultant registered with SAHRA', '{"project_flag": "is_heritage"}', true, 'Structure older than 60 years', 1),
  ('special_conditions', 'SAHRA Section 34 Permit', 'Permit from SAHRA for proposed alterations to structures older than 60 years.', 'Required before any alterations or demolitions of heritage structures.', 'National Heritage Resources Act 25/1999', 'SAHRA via SAHRIS portal', '{"project_flag": "is_heritage"}', true, 'Structure older than 60 years', 2),
  ('special_conditions', 'Demolition Notice (30 days)', 'Written notice to the municipality at least 30 days before demolishing any existing structure.', 'Required for any demolition of existing structures.', 'NBR Act 103/1977, Section 7(1)', 'Municipal Building Control office', '{"project_flag": "is_addition"}', true, 'Addition or alteration involving demolition', 3),
  ('special_conditions', 'Coastal Set-Back Line Compliance', 'Demonstration that the proposed development complies with the coastal set-back line.', 'Required for all developments in the coastal zone.', 'NEM:ICMA, Section 25', 'Provincial environmental authority', '{"project_flag": "is_coastal"}', true, 'Coastal zone property', 4),
  ('special_conditions', 'Dolomite Stability Report', 'Dolomite stability investigation report confirming the site is suitable for development.', 'Required for all developments in dolomite risk areas.', 'SANS 10400-B, Council for Geoscience Guidelines', 'Council for Geoscience or registered geotechnical engineer', '{"project_flag": "is_dolomite_zone"}', true, 'Dolomite risk zone', 5),
  ('special_conditions', 'Permission to Occupy (Communal Land)', 'Permission to Occupy or equivalent land rights document for building on communal land.', 'Required for developments on communal or tribal land.', 'Interim Protection of Informal Land Rights Act 31/1996', 'Traditional Authority / Department of Rural Development', '{"project_flag": "is_communal_land"}', true, 'Communal/tribal land', 6);
