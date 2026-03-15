'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Save,
  Ruler,
  Building2,
  Maximize2,
  ArrowUpFromLine,
} from 'lucide-react'

interface ZoneParam {
  id: number
  municipality_id: number
  zone_code: string
  zone_name: string
  coverage_max: number | null
  far_max: number | null
  height_max_m: number | null
  front_setback_m: number | null
  side_setback_m: number | null
  rear_setback_m: number | null
  parking_ratio: string | null
}

interface ProjectParams {
  gfa_sqm: number | null
  site_area_sqm: number | null
  coverage_sqm: number | null
  height_m: number | null
  front_setback_m: number | null
  side_setback_m: number | null
  rear_setback_m: number | null
  parking_bays: number | null
}

export default function ParametersPage() {
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [zoneParams, setZoneParams] = useState<ZoneParam[]>([])
  const [selectedZone, setSelectedZone] = useState<ZoneParam | null>(null)
  const [projectParams, setProjectParams] = useState<ProjectParams>({
    gfa_sqm: null,
    site_area_sqm: null,
    coverage_sqm: null,
    height_m: null,
    front_setback_m: null,
    side_setback_m: null,
    rear_setback_m: null,
    parking_bays: null,
  })
  const [municipalityId, setMunicipalityId] = useState<number | null>(null)
  const [projectName, setProjectName] = useState('')

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()

      const { data: project } = await supabase
        .from('projects')
        .select('name, municipality_id, gfa_sqm, site_area_sqm, coverage_sqm, height_m, front_setback_m, side_setback_m, rear_setback_m, parking_bays')
        .eq('id', params.id)
        .single()

      if (project) {
        setProjectName(project.name)
        setMunicipalityId(project.municipality_id)
        setProjectParams({
          gfa_sqm: project.gfa_sqm,
          site_area_sqm: project.site_area_sqm,
          coverage_sqm: project.coverage_sqm,
          height_m: project.height_m,
          front_setback_m: project.front_setback_m,
          side_setback_m: project.side_setback_m,
          rear_setback_m: project.rear_setback_m,
          parking_bays: project.parking_bays,
        })

        if (project.municipality_id) {
          const { data: zones } = await supabase
            .from('zone_parameters')
            .select('*')
            .eq('municipality_id', project.municipality_id)
            .order('zone_code')

          setZoneParams(zones || [])
        }
      }

      setLoading(false)
    }
    fetchData()
  }, [params.id])

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('projects')
      .update(projectParams)
      .eq('id', params.id)

    if (error) {
      toast.error('Failed to save parameters')
    } else {
      toast.success('Parameters saved')
    }
    setSaving(false)
  }

  const checkPass = (actual: number | null, max: number | null, isSetback = false) => {
    if (actual === null || max === null) return null
    return isSetback ? actual >= max : actual <= max
  }

  const coveragePercent =
    projectParams.site_area_sqm && projectParams.coverage_sqm
      ? ((projectParams.coverage_sqm / projectParams.site_area_sqm) * 100).toFixed(1)
      : null

  const farValue =
    projectParams.site_area_sqm && projectParams.gfa_sqm
      ? (projectParams.gfa_sqm / projectParams.site_area_sqm).toFixed(2)
      : null

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/projects/${params.id}`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
        >
          <ArrowLeft className="h-4 w-4" />
          {projectName || 'Back to Project'}
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Technical Parameters</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Enter your site measurements and check against zoning requirements
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2 rounded-full">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Zone selector */}
      {zoneParams.length > 0 && (
        <Card className="mb-6 rounded-2xl">
          <CardContent className="p-5">
            <h3 className="mb-3 text-sm font-semibold">Select Zoning Scheme</h3>
            <div className="flex flex-wrap gap-2">
              {zoneParams.map((zone) => (
                <button
                  key={zone.id}
                  onClick={() => setSelectedZone(zone)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-medium transition',
                    selectedZone?.id === zone.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300'
                  )}
                >
                  {zone.zone_code} &ndash; {zone.zone_name}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Parameters grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Site area */}
        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Maximize2 className="h-4 w-4 text-neutral-400" />
              <h3 className="text-sm font-semibold">Site &amp; Coverage</h3>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-neutral-500">Site Area (m\u00B2)</Label>
                <Input
                  type="number"
                  value={projectParams.site_area_sqm ?? ''}
                  onChange={(e) =>
                    setProjectParams((p) => ({
                      ...p,
                      site_area_sqm: e.target.value ? parseFloat(e.target.value) : null,
                    }))
                  }
                  className="rounded-xl"
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-neutral-500">Building Coverage (m\u00B2)</Label>
                <Input
                  type="number"
                  value={projectParams.coverage_sqm ?? ''}
                  onChange={(e) =>
                    setProjectParams((p) => ({
                      ...p,
                      coverage_sqm: e.target.value ? parseFloat(e.target.value) : null,
                    }))
                  }
                  className="rounded-xl"
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-neutral-500">GFA (m\u00B2)</Label>
                <Input
                  type="number"
                  value={projectParams.gfa_sqm ?? ''}
                  onChange={(e) =>
                    setProjectParams((p) => ({
                      ...p,
                      gfa_sqm: e.target.value ? parseFloat(e.target.value) : null,
                    }))
                  }
                  className="rounded-xl"
                  min={0}
                />
              </div>

              {/* Calculated values */}
              {coveragePercent && (
                <ParameterCheck
                  label="Coverage"
                  value={`${coveragePercent}%`}
                  limit={selectedZone?.coverage_max ? `${selectedZone.coverage_max}% max` : null}
                  pass={
                    selectedZone?.coverage_max
                      ? parseFloat(coveragePercent) <= selectedZone.coverage_max
                      : null
                  }
                />
              )}
              {farValue && (
                <ParameterCheck
                  label="FAR"
                  value={farValue}
                  limit={selectedZone?.far_max ? `${selectedZone.far_max} max` : null}
                  pass={
                    selectedZone?.far_max
                      ? parseFloat(farValue) <= selectedZone.far_max
                      : null
                  }
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Height */}
        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <ArrowUpFromLine className="h-4 w-4 text-neutral-400" />
              <h3 className="text-sm font-semibold">Height</h3>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-neutral-500">Building Height (m)</Label>
                <Input
                  type="number"
                  value={projectParams.height_m ?? ''}
                  onChange={(e) =>
                    setProjectParams((p) => ({
                      ...p,
                      height_m: e.target.value ? parseFloat(e.target.value) : null,
                    }))
                  }
                  className="rounded-xl"
                  min={0}
                  step={0.1}
                />
              </div>
              <ParameterCheck
                label="Height"
                value={projectParams.height_m ? `${projectParams.height_m} m` : null}
                limit={selectedZone?.height_max_m ? `${selectedZone.height_max_m} m max` : null}
                pass={checkPass(projectParams.height_m, selectedZone?.height_max_m ?? null)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Setbacks */}
        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Ruler className="h-4 w-4 text-neutral-400" />
              <h3 className="text-sm font-semibold">Building Lines / Setbacks</h3>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-neutral-500">Front Setback (m)</Label>
                <Input
                  type="number"
                  value={projectParams.front_setback_m ?? ''}
                  onChange={(e) =>
                    setProjectParams((p) => ({
                      ...p,
                      front_setback_m: e.target.value ? parseFloat(e.target.value) : null,
                    }))
                  }
                  className="rounded-xl"
                  min={0}
                  step={0.1}
                />
                <ParameterCheck
                  label="Front"
                  value={projectParams.front_setback_m ? `${projectParams.front_setback_m} m` : null}
                  limit={selectedZone?.front_setback_m ? `${selectedZone.front_setback_m} m min` : null}
                  pass={checkPass(projectParams.front_setback_m, selectedZone?.front_setback_m ?? null, true)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-neutral-500">Side Setback (m)</Label>
                <Input
                  type="number"
                  value={projectParams.side_setback_m ?? ''}
                  onChange={(e) =>
                    setProjectParams((p) => ({
                      ...p,
                      side_setback_m: e.target.value ? parseFloat(e.target.value) : null,
                    }))
                  }
                  className="rounded-xl"
                  min={0}
                  step={0.1}
                />
                <ParameterCheck
                  label="Side"
                  value={projectParams.side_setback_m ? `${projectParams.side_setback_m} m` : null}
                  limit={selectedZone?.side_setback_m ? `${selectedZone.side_setback_m} m min` : null}
                  pass={checkPass(projectParams.side_setback_m, selectedZone?.side_setback_m ?? null, true)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-neutral-500">Rear Setback (m)</Label>
                <Input
                  type="number"
                  value={projectParams.rear_setback_m ?? ''}
                  onChange={(e) =>
                    setProjectParams((p) => ({
                      ...p,
                      rear_setback_m: e.target.value ? parseFloat(e.target.value) : null,
                    }))
                  }
                  className="rounded-xl"
                  min={0}
                  step={0.1}
                />
                <ParameterCheck
                  label="Rear"
                  value={projectParams.rear_setback_m ? `${projectParams.rear_setback_m} m` : null}
                  limit={selectedZone?.rear_setback_m ? `${selectedZone.rear_setback_m} m min` : null}
                  pass={checkPass(projectParams.rear_setback_m, selectedZone?.rear_setback_m ?? null, true)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Parking */}
        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-neutral-400" />
              <h3 className="text-sm font-semibold">Parking</h3>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-neutral-500">Parking Bays Provided</Label>
                <Input
                  type="number"
                  value={projectParams.parking_bays ?? ''}
                  onChange={(e) =>
                    setProjectParams((p) => ({
                      ...p,
                      parking_bays: e.target.value ? parseInt(e.target.value) : null,
                    }))
                  }
                  className="rounded-xl"
                  min={0}
                />
              </div>
              {selectedZone?.parking_ratio && (
                <div className="rounded-lg bg-neutral-50 p-3 text-xs text-neutral-500 dark:bg-neutral-800">
                  <span className="font-medium">Required ratio:</span> {selectedZone.parking_ratio}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ParameterCheck({
  label,
  value,
  limit,
  pass,
}: {
  label: string
  value: string | null
  limit: string | null
  pass: boolean | null
}) {
  if (!value) return null

  return (
    <div className={cn(
      'flex items-center justify-between rounded-lg p-2.5 text-xs',
      pass === true && 'bg-green-50 dark:bg-green-950/30',
      pass === false && 'bg-red-50 dark:bg-red-950/30',
      pass === null && 'bg-neutral-50 dark:bg-neutral-800'
    )}>
      <div>
        <span className="font-medium text-neutral-700 dark:text-neutral-300">{label}:</span>{' '}
        <span className="text-neutral-500">{value}</span>
        {limit && (
          <span className="ml-2 text-neutral-400">({limit})</span>
        )}
      </div>
      {pass === true && <CheckCircle2 className="h-4 w-4 text-green-600" />}
      {pass === false && <XCircle className="h-4 w-4 text-red-500" />}
    </div>
  )
}
