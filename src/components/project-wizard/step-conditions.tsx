'use client'

import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Waves,
  Landmark,
  PlusCircle,
  Building2,
  Users,
  Mountain,
} from 'lucide-react'
import type { WizardData } from './wizard-container'

interface StepConditionsProps {
  data: WizardData
  onChange: (updates: Partial<WizardData>) => void
}

interface ConditionToggle {
  key: keyof Pick<
    WizardData,
    | 'is_coastal'
    | 'is_heritage'
    | 'is_addition'
    | 'is_sectional_title'
    | 'is_communal_land'
    | 'is_dolomite_zone'
  >
  label: string
  description: string
  icon: React.ElementType
  warning?: string
}

const conditions: ConditionToggle[] = [
  {
    key: 'is_coastal',
    label: 'Coastal Zone',
    description: 'Property is within the coastal management zone (NEMICMA)',
    icon: Waves,
    warning: 'Additional environmental authorisation may be required from DEADP/EDTEA.',
  },
  {
    key: 'is_heritage',
    label: 'Heritage Site',
    description: 'Property is older than 60 years or located in a heritage area',
    icon: Landmark,
    warning: 'A Heritage Impact Assessment (HIA) from SAHRA/Amafa may be required.',
  },
  {
    key: 'is_addition',
    label: 'Addition / Alteration',
    description: 'This is an addition to or alteration of an existing building',
    icon: PlusCircle,
    warning: 'Original approved plans and completion certificate may be required.',
  },
  {
    key: 'is_sectional_title',
    label: 'Sectional Title',
    description: 'Property is a sectional title unit (e.g., apartment, townhouse)',
    icon: Building2,
    warning: 'Body corporate approval and registered sectional plan required.',
  },
  {
    key: 'is_communal_land',
    label: 'Communal / Traditional Land',
    description: 'Property is located on communal or traditional authority land',
    icon: Users,
    warning: 'Permission to Occupy (PTO) or traditional authority consent required.',
  },
  {
    key: 'is_dolomite_zone',
    label: 'Dolomite Risk Area',
    description: 'Property is located in a known dolomite risk zone',
    icon: Mountain,
    warning: 'A stability investigation report by a competent geotechnical engineer is required.',
  },
]

export function StepConditions({ data, onChange }: StepConditionsProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-500">
        Toggle any conditions that apply to your project. These will trigger additional
        requirements in your compliance checklist.
      </p>

      <div className="space-y-3">
        {conditions.map((condition) => {
          const isActive = data[condition.key]
          const Icon = condition.icon

          return (
            <div
              key={condition.key}
              className={cn(
                'rounded-xl border p-4 transition-all',
                isActive
                  ? 'border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-950/20'
                  : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900'
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                      isActive
                        ? 'bg-amber-100 dark:bg-amber-900/50'
                        : 'bg-neutral-100 dark:bg-neutral-800'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-4.5 w-4.5',
                        isActive ? 'text-amber-600' : 'text-neutral-400'
                      )}
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor={condition.key}
                      className={cn(
                        'text-sm font-medium cursor-pointer',
                        isActive ? 'text-amber-800 dark:text-amber-200' : ''
                      )}
                    >
                      {condition.label}
                    </Label>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {condition.description}
                    </p>
                    {isActive && condition.warning && (
                      <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">
                        \u26A0 {condition.warning}
                      </p>
                    )}
                  </div>
                </div>
                <Switch
                  id={condition.key}
                  checked={isActive}
                  onCheckedChange={(checked) =>
                    onChange({ [condition.key]: checked })
                  }
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
