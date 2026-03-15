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
  FOR INSERT WITH CHECK (uploaded_by = auth.uid());

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
  FOR SELECT USING (submitted_by = auth.uid());

CREATE POLICY "corrections_own_insert" ON data_corrections
  FOR INSERT WITH CHECK (submitted_by = auth.uid());

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
