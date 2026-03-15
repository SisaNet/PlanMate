-- ============================================
-- SUPER ADMIN
-- ============================================

-- Add super admin flag to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;

-- Allow super admins to read ALL profiles
CREATE POLICY "superadmin_read_all_profiles" ON profiles
  FOR SELECT USING (
    (SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true
  );

-- Allow super admins to update ALL profiles
CREATE POLICY "superadmin_update_all_profiles" ON profiles
  FOR UPDATE USING (
    (SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true
  );

-- Allow super admins to read ALL projects
CREATE POLICY "superadmin_read_all_projects" ON projects
  FOR SELECT USING (
    (SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true
  );

-- Allow super admins to read ALL checklist items
CREATE POLICY "superadmin_read_all_checklist" ON checklist_items
  FOR SELECT USING (
    (SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true
  );

-- Allow super admins to read ALL notifications
CREATE POLICY "superadmin_read_all_notifications" ON notifications
  FOR SELECT USING (
    (SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true
  );

-- ============================================
-- HOW TO SET THE FIRST SUPER ADMIN:
-- Run this in the Supabase SQL Editor, replacing YOUR_USER_ID:
--
-- UPDATE profiles SET is_super_admin = true WHERE email = 'your@email.com';
-- ============================================
