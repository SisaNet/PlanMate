// Database types for PlanMate
// These mirror the Supabase PostgreSQL schema

export type UserRole = 'admin' | 'staff' | 'individual'
export type PlanTier = 'free' | 'professional'
export type MunicipalityType = 'local' | 'metropolitan'
export type SubmissionMethod = 'electronic' | 'counter' | 'both'
export type ProjectStatus = 'draft' | 'in_progress' | 'ready' | 'submitted' | 'approved'
export type ChecklistStatus = 'pending' | 'complete' | 'flagged' | 'not_applicable'
export type ComplianceCategory =
  | 'administrative'
  | 'ownership_property'
  | 'professional_appointments'
  | 'drawing_set'
  | 'energy_environmental'
  | 'engineering_structural'
  | 'special_conditions'
export type NotificationType = 'deadline' | 'data_change' | 'inspection' | 'system'
export type CorrectionStatus = 'pending' | 'accepted' | 'rejected'
export type InspectionStatus = 'upcoming' | 'booked' | 'complete'
export type BuildingType = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H'

export interface Profile {
  id: string
  full_name: string
  email: string
  phone: string | null
  sacap_number: string | null
  sacap_category: string | null
  practice_id: string | null
  role: UserRole
  plan_tier: PlanTier
  created_at: string
  updated_at: string
}

export interface Practice {
  id: string
  name: string
  logo_url: string | null
  paystack_customer_id: string | null
  paystack_subscription_code: string | null
  max_users: number
  created_at: string
  updated_at: string
}

export interface Province {
  id: number
  name: string
  code: string
}

export interface DistrictMunicipality {
  id: number
  name: string
  province_id: number
}

export interface Municipality {
  id: number
  name: string
  municipality_type: MunicipalityType
  district_id: number | null
  province_id: number
  aliases: string[]
  submission_method: SubmissionMethod
  portal_url: string | null
  application_form_url: string | null
  fee_schedule_url: string | null
  physical_address: string | null
  phone: string | null
  email: string | null
  office_hours: string | null
  plan_validity_months: number
  last_verified_at: string | null
  climate_zone: number | null
  risk_flags: Record<string, boolean>
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ZoneParameter {
  id: number
  municipality_id: number
  zone_code: string
  zone_name: string | null
  front_building_line_m: number | null
  lateral_building_line_m: number | null
  rear_building_line_m: number | null
  max_coverage_pct: number | null
  max_height_m: number | null
  far: number | null
  min_erf_size_sqm: number | null
  parking_ratio: string | null
  coverage_tiers: CoverageTier[] | null
  source_scheme: string | null
  source_clause: string | null
  created_at: string
}

export interface CoverageTier {
  min_sqm: number
  max_sqm: number | null
  coverage_pct: number
}

export interface Project {
  id: string
  user_id: string
  practice_id: string | null
  municipality_id: number | null
  zone_parameter_id: number | null
  status: ProjectStatus
  name: string
  street_address: string | null
  erf_number: string | null
  zoning: string | null
  building_type: BuildingType | null
  building_use_description: string | null
  gfa_sqm: number | null
  storeys: number | null
  owner_name: string | null
  owner_contact: string | null
  is_coastal: boolean
  is_heritage: boolean
  is_addition: boolean
  is_sectional_title: boolean
  is_communal_land: boolean
  is_dolomite_zone: boolean
  wizard_step: number
  wizard_data: Record<string, unknown>
  approval_date: string | null
  lapse_date: string | null
  created_at: string
  updated_at: string
  // Joined
  municipality?: Municipality
}

export interface ComplianceRule {
  id: number
  category: ComplianceCategory
  name: string
  label: string
  description: string | null
  why_applicable: string | null
  source_legislation: string | null
  where_to_obtain: string | null
  conditions: Record<string, unknown>
  municipality_id: number | null
  is_conditional: boolean
  trigger_label: string | null
  sort_order: number
  created_at: string
}

export interface ChecklistItem {
  id: string
  project_id: string
  rule_id: number
  label: string
  description: string | null
  category: ComplianceCategory
  status: ChecklistStatus
  sort_order: number
  notes: string | null
  is_conditional: boolean
  trigger_label: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  // Joined
  rule?: ComplianceRule
}

export interface RiskFlagDefinition {
  id: number
  code: string
  name: string
  description: string | null
  requirements: string | null
  administering_authority: string | null
  typical_timeframe: string | null
  info_url: string | null
  conditions: Record<string, unknown>
  related_rule_ids: number[]
}

export interface ProjectRiskFlag {
  id: number
  project_id: string
  risk_flag_id: number
  created_at: string
  // Joined
  risk_flag?: RiskFlagDefinition
}

export interface Notification {
  id: string
  user_id: string
  notification_type: NotificationType
  title: string
  message: string | null
  project_id: string | null
  is_read: boolean
  created_at: string
}

export interface InspectionStage {
  id: string
  project_id: string
  stage_name: string
  expected_date: string | null
  actual_date: string | null
  status: InspectionStatus
  notes: string | null
  created_at: string
}

export interface Document {
  id: string
  project_id: string
  checklist_item_id: string | null
  file_name: string
  file_url: string
  file_size_bytes: number
  version: number
  uploaded_by: string
  description: string | null
  created_at: string
}

export const BUILDING_TYPE_LABELS: Record<BuildingType, string> = {
  A: 'Entertainment & Assembly (A)',
  B: 'High Risk Commercial (B)',
  C: 'Exhibition Hall (C)',
  D: 'Industrial (D)',
  E: 'Dwelling House (E)',
  F: 'Large Shop (F)',
  G: 'Office (G)',
  H: 'Hotel / Dormitory (H)',
}

export const COMPLIANCE_CATEGORY_LABELS: Record<ComplianceCategory, string> = {
  administrative: 'Administrative',
  ownership_property: 'Ownership & Property',
  professional_appointments: 'Professional Appointments',
  drawing_set: 'Drawing Set',
  energy_environmental: 'Energy & Environmental',
  engineering_structural: 'Engineering & Structural',
  special_conditions: 'Special Conditions',
}
