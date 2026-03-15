'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { WizardData } from './wizard-container'

interface StepPropertyProps {
  data: WizardData
  onChange: (updates: Partial<WizardData>) => void
}

export function StepProperty({ data, onChange }: StepPropertyProps) {
  return (
    <div className="space-y-6">
      {/* Street address */}
      <div className="space-y-2">
        <Label htmlFor="street_address" className="text-sm font-medium">
          Street Address <span className="text-red-500">*</span>
        </Label>
        <Input
          id="street_address"
          placeholder="e.g., 12 Main Road, Claremont"
          value={data.street_address}
          onChange={(e) => onChange({ street_address: e.target.value })}
          className="rounded-xl"
        />
      </div>

      {/* Erf number and Zoning - side by side */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="erf_number" className="text-sm font-medium">
            Erf / Stand Number
          </Label>
          <Input
            id="erf_number"
            placeholder="e.g., Erf 1234"
            value={data.erf_number}
            onChange={(e) => onChange({ erf_number: e.target.value })}
            className="rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="zoning" className="text-sm font-medium">
            Zoning
          </Label>
          <Input
            id="zoning"
            placeholder="e.g., Residential 1, SR1"
            value={data.zoning}
            onChange={(e) => onChange({ zoning: e.target.value })}
            className="rounded-xl"
          />
          <p className="text-xs text-neutral-400">
            As per your zoning certificate or town planning scheme.
          </p>
        </div>
      </div>

      {/* Owner details */}
      <div className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-4 dark:border-neutral-700 dark:bg-neutral-900/50">
        <h4 className="mb-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Property Owner
        </h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="owner_name" className="text-xs text-neutral-500">
              Owner Name
            </Label>
            <Input
              id="owner_name"
              placeholder="Full name or company"
              value={data.owner_name}
              onChange={(e) => onChange({ owner_name: e.target.value })}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="owner_contact" className="text-xs text-neutral-500">
              Contact Details
            </Label>
            <Input
              id="owner_contact"
              placeholder="Email or phone number"
              value={data.owner_contact}
              onChange={(e) => onChange({ owner_contact: e.target.value })}
              className="rounded-xl"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
