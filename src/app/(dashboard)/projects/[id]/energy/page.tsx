'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Zap,
  CheckCircle2,
  XCircle,
  Calculator,
  Sun,
  Droplets,
  Wind,
} from 'lucide-react'

interface EnergyCalc {
  wall_r_value: number | null
  roof_r_value: number | null
  floor_r_value: number | null
  window_area_pct: number | null
  orientation: string
  shading_provided: boolean
  solar_water_heater: boolean
  ceiling_insulation_mm: number | null
  climate_zone: number | null
}

const SANS_10400_XA = {
  wall_r_min: { 1: 0.4, 2: 0.5, 3: 0.5, 4: 0.6, 5: 0.7, 6: 0.7 } as Record<number, number>,
  roof_r_min: { 1: 3.2, 2: 3.2, 3: 3.7, 4: 3.7, 5: 3.7, 6: 3.7 } as Record<number, number>,
  max_window_pct: 15,
}

export default function EnergyPage() {
  const params = useParams()
  const [calc, setCalc] = useState<EnergyCalc>({
    wall_r_value: null,
    roof_r_value: null,
    floor_r_value: null,
    window_area_pct: null,
    orientation: 'north',
    shading_provided: false,
    solar_water_heater: false,
    ceiling_insulation_mm: null,
    climate_zone: null,
  })

  const update = (updates: Partial<EnergyCalc>) => setCalc((p) => ({ ...p, ...updates }))

  const wallPass =
    calc.wall_r_value && calc.climate_zone
      ? calc.wall_r_value >= (SANS_10400_XA.wall_r_min[calc.climate_zone] || 0.5)
      : null

  const roofPass =
    calc.roof_r_value && calc.climate_zone
      ? calc.roof_r_value >= (SANS_10400_XA.roof_r_min[calc.climate_zone] || 3.7)
      : null

  const windowPass =
    calc.window_area_pct !== null ? calc.window_area_pct <= SANS_10400_XA.max_window_pct : null

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/projects/${params.id}`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Project
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Energy Compliance</h1>
        <p className="mt-1 text-sm text-neutral-500">
          SANS 10400-XA energy efficiency calculator
        </p>
      </div>

      {/* Climate zone selector */}
      <Card className="mb-6 rounded-2xl">
        <CardContent className="p-5">
          <h3 className="mb-3 text-sm font-semibold">Climate Zone</h3>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6].map((zone) => (
              <button
                key={zone}
                onClick={() => update({ climate_zone: zone })}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition',
                  calc.climate_zone === zone
                    ? 'bg-blue-600 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300'
                )}
              >
                {zone}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-neutral-400">
            Climate zone is determined by your municipality location (SANS 10400-XA Annex A)
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Walls */}
        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Wind className="h-4 w-4 text-neutral-400" />
              <h3 className="text-sm font-semibold">Wall Insulation</h3>
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs text-neutral-500">Wall R-value (m\u00B2K/W)</Label>
                <Input
                  type="number"
                  value={calc.wall_r_value ?? ''}
                  onChange={(e) => update({ wall_r_value: e.target.value ? parseFloat(e.target.value) : null })}
                  className="rounded-xl"
                  step={0.1}
                  min={0}
                />
              </div>
              {wallPass !== null && (
                <ResultBadge
                  pass={wallPass}
                  label={`R${calc.wall_r_value} ${wallPass ? '\u2265' : '<'} R${calc.climate_zone ? SANS_10400_XA.wall_r_min[calc.climate_zone] : '?'} (Zone ${calc.climate_zone} min)`}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Roof */}
        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Sun className="h-4 w-4 text-neutral-400" />
              <h3 className="text-sm font-semibold">Roof / Ceiling Insulation</h3>
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs text-neutral-500">Roof R-value (m\u00B2K/W)</Label>
                <Input
                  type="number"
                  value={calc.roof_r_value ?? ''}
                  onChange={(e) => update({ roof_r_value: e.target.value ? parseFloat(e.target.value) : null })}
                  className="rounded-xl"
                  step={0.1}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-neutral-500">Ceiling Insulation Thickness (mm)</Label>
                <Input
                  type="number"
                  value={calc.ceiling_insulation_mm ?? ''}
                  onChange={(e) => update({ ceiling_insulation_mm: e.target.value ? parseInt(e.target.value) : null })}
                  className="rounded-xl"
                  min={0}
                />
              </div>
              {roofPass !== null && (
                <ResultBadge
                  pass={roofPass}
                  label={`R${calc.roof_r_value} ${roofPass ? '\u2265' : '<'} R${calc.climate_zone ? SANS_10400_XA.roof_r_min[calc.climate_zone] : '?'} (Zone ${calc.climate_zone} min)`}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Fenestration */}
        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Droplets className="h-4 w-4 text-neutral-400" />
              <h3 className="text-sm font-semibold">Fenestration</h3>
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs text-neutral-500">Window Area (% of floor area)</Label>
                <Input
                  type="number"
                  value={calc.window_area_pct ?? ''}
                  onChange={(e) => update({ window_area_pct: e.target.value ? parseFloat(e.target.value) : null })}
                  className="rounded-xl"
                  min={0}
                  max={100}
                  step={0.5}
                />
              </div>
              {windowPass !== null && (
                <ResultBadge
                  pass={windowPass}
                  label={`${calc.window_area_pct}% ${windowPass ? '\u2264' : '>'} ${SANS_10400_XA.max_window_pct}% max`}
                />
              )}
              <div className="space-y-2">
                <Label className="text-xs text-neutral-500">Primary Orientation</Label>
                <div className="flex flex-wrap gap-2">
                  {['north', 'south', 'east', 'west'].map((dir) => (
                    <button
                      key={dir}
                      onClick={() => update({ orientation: dir })}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-xs font-medium capitalize transition',
                        calc.orientation === dir
                          ? 'bg-blue-600 text-white'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300'
                      )}
                    >
                      {dir}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Water heating */}
        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Calculator className="h-4 w-4 text-neutral-400" />
              <h3 className="text-sm font-semibold">Water Heating</h3>
            </div>
            <div className="space-y-4">
              <button
                onClick={() => update({ solar_water_heater: !calc.solar_water_heater })}
                className={cn(
                  'flex w-full items-center justify-between rounded-xl border p-4 transition',
                  calc.solar_water_heater
                    ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950/30'
                    : 'border-neutral-200 dark:border-neutral-700'
                )}
              >
                <div>
                  <p className="text-sm font-medium">Solar Water Heater</p>
                  <p className="text-xs text-neutral-400">At least 50% of hot water demand via solar</p>
                </div>
                {calc.solar_water_heater ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-neutral-300" />
                )}
              </button>
              <button
                onClick={() => update({ shading_provided: !calc.shading_provided })}
                className={cn(
                  'flex w-full items-center justify-between rounded-xl border p-4 transition',
                  calc.shading_provided
                    ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950/30'
                    : 'border-neutral-200 dark:border-neutral-700'
                )}
              >
                <div>
                  <p className="text-sm font-medium">External Shading</p>
                  <p className="text-xs text-neutral-400">Overhangs, louvers, or screens on west/east windows</p>
                </div>
                {calc.shading_provided ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-neutral-300" />
                )}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ResultBadge({ pass, label }: { pass: boolean; label: string }) {
  return (
    <div className={cn(
      'flex items-center gap-2 rounded-lg p-2.5 text-xs font-medium',
      pass ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300' : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300'
    )}>
      {pass ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
      {label}
    </div>
  )
}
