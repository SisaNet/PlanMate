'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MunicipalitySelector } from '@/components/municipality/municipality-selector'
import type { WizardData } from './wizard-container'

interface StepBasicsProps {
  data: WizardData
  onChange: (updates: Partial<WizardData>) => void
}

export function StepBasics({ data, onChange }: StepBasicsProps) {
  return (
    <div className="space-y-6">
      {/* Project name */}
      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-medium">
          Project Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          placeholder="e.g., Smith Residence Extension"
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="rounded-xl"
        />
        <p className="text-xs text-neutral-400">
          Give your project a descriptive name for easy identification.
        </p>
      </div>

      {/* Municipality selector */}
      <div>
        <MunicipalitySelector
          value={data.municipality_id}
          onChange={(id, municipality) => {
            onChange({
              municipality_id: id,
              municipality_name: municipality?.name || '',
            })
          }}
        />
        <p className="mt-2 text-xs text-neutral-400">
          Search by city, town, or suburb name to find the correct municipality for your project.
        </p>
      </div>
    </div>
  )
}
