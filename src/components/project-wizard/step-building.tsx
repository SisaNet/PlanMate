'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { BUILDING_TYPE_LABELS } from '@/types/database'
import type { BuildingType } from '@/types/database'
import type { WizardData } from './wizard-container'

interface StepBuildingProps {
  data: WizardData
  onChange: (updates: Partial<WizardData>) => void
}

const buildingTypeDescriptions: Record<string, string> = {
  A: 'Theatres, cinemas, halls, churches, stadia',
  B: 'Factories, workshops with hazardous materials',
  C: 'Exhibition halls, museums, galleries',
  D: 'Factories, workshops, warehouses',
  E: 'Houses, flats, maisonettes, hostels',
  F: 'Shops, supermarkets over 250m\u00B2',
  G: 'Offices, banks, consulting rooms',
  H: 'Hotels, boarding houses, dormitories',
}

export function StepBuilding({ data, onChange }: StepBuildingProps) {
  return (
    <div className="space-y-6">
      {/* Building type selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          Building Classification (SANS 10400) <span className="text-red-500">*</span>
        </Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(BUILDING_TYPE_LABELS) as BuildingType[]).map((type) => (
            <button
              key={type}
              onClick={() => onChange({ building_type: type })}
              className={cn(
                'flex items-start gap-3 rounded-xl border p-3 text-left transition-all',
                data.building_type === type
                  ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500 dark:bg-blue-950/30'
                  : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-neutral-600'
              )}
            >
              <div
                className={cn(
                  'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold',
                  data.building_type === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800'
                )}
              >
                {type}
              </div>
              <div>
                <p className={cn(
                  'text-sm font-medium',
                  data.building_type === type ? 'text-blue-700 dark:text-blue-300' : 'text-neutral-700 dark:text-neutral-300'
                )}>
                  {BUILDING_TYPE_LABELS[type]}
                </p>
                <p className="text-xs text-neutral-400">{buildingTypeDescriptions[type]}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Building use description */}
      <div className="space-y-2">
        <Label htmlFor="building_use" className="text-sm font-medium">
          Building Use Description
        </Label>
        <Textarea
          id="building_use"
          placeholder="Describe the intended use, e.g., Three-bedroom dwelling house with double garage and servant's quarters"
          value={data.building_use_description}
          onChange={(e) => onChange({ building_use_description: e.target.value })}
          className="rounded-xl resize-none"
          rows={3}
        />
      </div>

      {/* GFA and storeys */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="gfa" className="text-sm font-medium">
            Gross Floor Area (m\u00B2)
          </Label>
          <Input
            id="gfa"
            type="number"
            placeholder="e.g., 250"
            value={data.gfa_sqm ?? ''}
            onChange={(e) =>
              onChange({ gfa_sqm: e.target.value ? parseFloat(e.target.value) : null })
            }
            className="rounded-xl"
            min={0}
          />
          <p className="text-xs text-neutral-400">
            Total area of all floors measured to outer face of walls.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="storeys" className="text-sm font-medium">
            Number of Storeys
          </Label>
          <Input
            id="storeys"
            type="number"
            placeholder="e.g., 2"
            value={data.storeys ?? ''}
            onChange={(e) =>
              onChange({ storeys: e.target.value ? parseInt(e.target.value) : null })
            }
            className="rounded-xl"
            min={1}
            max={50}
          />
          <p className="text-xs text-neutral-400">
            Including basements and mezzanines.
          </p>
        </div>
      </div>
    </div>
  )
}
