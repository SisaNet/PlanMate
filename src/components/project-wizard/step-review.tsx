'use client'

import { BUILDING_TYPE_LABELS } from '@/types/database'
import type { BuildingType } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Pencil,
  MapPin,
  Home,
  Building2,
  AlertTriangle,
} from 'lucide-react'
import type { WizardData } from './wizard-container'

interface StepReviewProps {
  data: WizardData
  onEdit: (step: number) => void
}

export function StepReview({ data, onEdit }: StepReviewProps) {
  const activeConditions = [
    data.is_coastal && 'Coastal Zone',
    data.is_heritage && 'Heritage Site',
    data.is_addition && 'Addition / Alteration',
    data.is_sectional_title && 'Sectional Title',
    data.is_communal_land && 'Communal Land',
    data.is_dolomite_zone && 'Dolomite Risk',
  ].filter(Boolean)

  return (
    <div className="space-y-6">
      <p className="text-sm text-neutral-500">
        Review your project details below before creating. You can edit any section by
        clicking the edit button.
      </p>

      {/* Section 1: Basics */}
      <ReviewSection
        title="Project Basics"
        icon={MapPin}
        step={1}
        onEdit={onEdit}
      >
        <ReviewRow label="Project Name" value={data.name} />
        <ReviewRow
          label="Municipality"
          value={data.municipality_name || 'Not selected'}
        />
      </ReviewSection>

      {/* Section 2: Property */}
      <ReviewSection
        title="Property Details"
        icon={Home}
        step={2}
        onEdit={onEdit}
      >
        <ReviewRow label="Street Address" value={data.street_address} />
        <ReviewRow label="Erf Number" value={data.erf_number} />
        <ReviewRow label="Zoning" value={data.zoning} />
        <ReviewRow label="Owner" value={data.owner_name} />
        <ReviewRow label="Owner Contact" value={data.owner_contact} />
      </ReviewSection>

      {/* Section 3: Building */}
      <ReviewSection
        title="Building Details"
        icon={Building2}
        step={3}
        onEdit={onEdit}
      >
        <ReviewRow
          label="Building Type"
          value={
            data.building_type
              ? `Class ${data.building_type} \u2013 ${BUILDING_TYPE_LABELS[data.building_type as BuildingType]}`
              : ''
          }
        />
        <ReviewRow label="Use Description" value={data.building_use_description} />
        <ReviewRow
          label="Gross Floor Area"
          value={data.gfa_sqm ? `${data.gfa_sqm} m\u00B2` : ''}
        />
        <ReviewRow
          label="Storeys"
          value={data.storeys ? `${data.storeys}` : ''}
        />
      </ReviewSection>

      {/* Section 4: Conditions */}
      <ReviewSection
        title="Special Conditions"
        icon={AlertTriangle}
        step={4}
        onEdit={onEdit}
      >
        {activeConditions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {activeConditions.map((condition) => (
              <Badge
                key={condition as string}
                variant="secondary"
                className="rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
              >
                {condition}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-400">No special conditions apply</p>
        )}
      </ReviewSection>
    </div>
  )
}

function ReviewSection({
  title,
  icon: Icon,
  step,
  onEdit,
  children,
}: {
  title: string
  icon: React.ElementType
  step: number
  onEdit: (step: number) => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-neutral-400" />
          <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {title}
          </h4>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(step)}
          className="h-7 gap-1 rounded-full px-2 text-xs text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950"
        >
          <Pencil className="h-3 w-3" />
          Edit
        </Button>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-neutral-400">{label}</span>
      <span className="text-right font-medium text-neutral-700 dark:text-neutral-200">
        {value || '\u2014'}
      </span>
    </div>
  )
}
