import type { Project, ComplianceRule, ChecklistItem } from '@/types/database'

interface ProjectConditions {
  is_coastal: boolean
  is_heritage: boolean
  is_addition: boolean
  is_sectional_title: boolean
  is_communal_land: boolean
  is_dolomite_zone: boolean
  building_type: string | null
  gfa_sqm: number | null
  storeys: number | null
}

/**
 * Evaluates whether a compliance rule applies to a given project
 * based on the rule's conditions and the project's properties.
 */
export function evaluateRuleCondition(
  rule: ComplianceRule,
  project: ProjectConditions
): boolean {
  // If no conditions, rule always applies
  if (!rule.conditions || Object.keys(rule.conditions).length === 0) {
    return true
  }

  const conditions = rule.conditions as Record<string, unknown>

  // Check each condition
  for (const [key, value] of Object.entries(conditions)) {
    switch (key) {
      case 'is_coastal':
        if (project.is_coastal !== value) return false
        break
      case 'is_heritage':
        if (project.is_heritage !== value) return false
        break
      case 'is_addition':
        if (project.is_addition !== value) return false
        break
      case 'is_sectional_title':
        if (project.is_sectional_title !== value) return false
        break
      case 'is_communal_land':
        if (project.is_communal_land !== value) return false
        break
      case 'is_dolomite_zone':
        if (project.is_dolomite_zone !== value) return false
        break
      case 'building_type':
        if (Array.isArray(value)) {
          if (!project.building_type || !value.includes(project.building_type)) return false
        } else {
          if (project.building_type !== value) return false
        }
        break
      case 'gfa_min':
        if (!project.gfa_sqm || project.gfa_sqm < (value as number)) return false
        break
      case 'gfa_max':
        if (!project.gfa_sqm || project.gfa_sqm > (value as number)) return false
        break
      case 'storeys_min':
        if (!project.storeys || project.storeys < (value as number)) return false
        break
      case 'storeys_max':
        if (!project.storeys || project.storeys > (value as number)) return false
        break
      default:
        break
    }
  }

  return true
}

/**
 * Generates a checklist for a project by evaluating all applicable rules.
 */
export function generateChecklist(
  rules: ComplianceRule[],
  project: ProjectConditions
): Omit<ChecklistItem, 'id' | 'project_id' | 'created_at' | 'updated_at' | 'completed_at' | 'rule'>[] {
  const applicableRules = rules.filter((rule) => evaluateRuleCondition(rule, project))

  return applicableRules.map((rule, index) => ({
    rule_id: rule.id,
    label: rule.label,
    description: rule.description,
    category: rule.category,
    status: 'pending' as const,
    sort_order: index + 1,
    notes: null,
    is_conditional: !!(rule.conditions && Object.keys(rule.conditions).length > 0),
    trigger_label: rule.trigger_label || null,
  }))
}

/**
 * Calculates compliance progress for a project's checklist.
 */
export function calculateProgress(items: { status: string }[]) {
  const total = items.length
  if (total === 0) return { total: 0, completed: 0, pending: 0, flagged: 0, percentage: 0 }

  const completed = items.filter(
    (i) => i.status === 'complete' || i.status === 'not_applicable'
  ).length
  const flagged = items.filter((i) => i.status === 'flagged').length
  const pending = items.filter((i) => i.status === 'pending').length

  return {
    total,
    completed,
    pending,
    flagged,
    percentage: Math.round((completed / total) * 100),
  }
}

/**
 * Groups checklist items by category for display.
 */
export function groupByCategory<T extends { category: string }>(
  items: T[]
): Record<string, T[]> {
  return items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = []
    }
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, T[]>)
}
