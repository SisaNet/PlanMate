'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft,
  Download,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Circle,
  Printer,
  BarChart3,
} from 'lucide-react'
import { COMPLIANCE_CATEGORY_LABELS } from '@/types/database'
import type { ComplianceCategory } from '@/types/database'

interface ReportData {
  project: {
    name: string
    street_address: string
    municipality_name: string
    building_type: string
    gfa_sqm: number | null
    status: string
  }
  checklist: {
    label: string
    status: string
    category: string
    notes: string | null
  }[]
  drawings: {
    drawing_name: string
    is_complete: boolean
    is_required: boolean
  }[]
}

export default function ReportPage() {
  const params = useParams()
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()

      const [projectRes, checklistRes, drawingsRes] = await Promise.all([
        supabase
          .from('projects')
          .select('name, street_address, building_type, gfa_sqm, status, municipality:municipalities(name)')
          .eq('id', params.id)
          .single(),
        supabase
          .from('checklist_items')
          .select('label, status, category, notes')
          .eq('project_id', params.id)
          .order('sort_order'),
        supabase
          .from('drawing_checklist_items')
          .select('drawing_name, is_complete, is_required')
          .eq('project_id', params.id)
          .order('sort_order'),
      ])

      if (projectRes.data) {
        const mun = projectRes.data.municipality as unknown as { name: string } | null
        setReportData({
          project: {
            ...projectRes.data,
            municipality_name: mun?.name || '',
          },
          checklist: checklistRes.data || [],
          drawings: drawingsRes.data || [],
        })
      }

      setLoading(false)
    }
    fetchData()
  }, [params.id])

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    )
  }

  if (!reportData) return null

  const totalItems = reportData.checklist.length
  const completedItems = reportData.checklist.filter(
    (i) => i.status === 'complete' || i.status === 'not_applicable'
  ).length
  const flaggedItems = reportData.checklist.filter((i) => i.status === 'flagged').length
  const pendingItems = reportData.checklist.filter((i) => i.status === 'pending').length
  const progressPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

  const drawingsReady = reportData.drawings.filter((d) => d.is_complete).length
  const drawingsRequired = reportData.drawings.filter((d) => d.is_required).length
  const drawingsRequiredComplete = reportData.drawings.filter((d) => d.is_required && d.is_complete).length

  // Group checklist by category
  const grouped: Record<string, typeof reportData.checklist> = {}
  for (const item of reportData.checklist) {
    if (!grouped[item.category]) grouped[item.category] = []
    grouped[item.category].push(item)
  }

  const isReady = pendingItems === 0 && flaggedItems === 0 && drawingsRequiredComplete === drawingsRequired

  return (
    <div>
      <div className="mb-6 print:hidden">
        <Link
          href={`/dashboard/projects/${params.id}`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Project
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Compliance Report</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Summary report for plan submission
            </p>
          </div>
          <Button onClick={handlePrint} className="gap-2 rounded-full">
            <Printer className="h-4 w-4" />
            Print Report
          </Button>
        </div>
      </div>

      {/* Printable report */}
      <div className="space-y-6 print:space-y-4">
        {/* Header */}
        <Card className="rounded-2xl print:shadow-none print:border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">PlanMate Compliance Report</h2>
                <p className="text-sm text-neutral-500">
                  Generated {new Date().toLocaleDateString('en-ZA', { dateStyle: 'long' })}
                </p>
              </div>
              <Badge
                variant="secondary"
                className={cn(
                  'rounded-full px-4 py-1',
                  isReady
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                )}
              >
                {isReady ? 'Ready to Submit' : 'Not Ready'}
              </Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1 text-sm">
                <p><span className="text-neutral-400">Project:</span> {reportData.project.name}</p>
                <p><span className="text-neutral-400">Address:</span> {reportData.project.street_address || '\u2014'}</p>
                <p><span className="text-neutral-400">Municipality:</span> {reportData.project.municipality_name || '\u2014'}</p>
              </div>
              <div className="space-y-1 text-sm">
                <p><span className="text-neutral-400">Building Type:</span> Class {reportData.project.building_type || '\u2014'}</p>
                <p><span className="text-neutral-400">GFA:</span> {reportData.project.gfa_sqm ? `${reportData.project.gfa_sqm} m\u00B2` : '\u2014'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary stats */}
        <div className="grid gap-4 sm:grid-cols-4">
          <StatCard label="Total Items" value={totalItems} icon={BarChart3} />
          <StatCard label="Completed" value={completedItems} icon={CheckCircle2} color="text-green-600" />
          <StatCard label="Flagged" value={flaggedItems} icon={AlertTriangle} color="text-amber-500" />
          <StatCard label="Pending" value={pendingItems} icon={Circle} color="text-neutral-400" />
        </div>

        {/* Progress */}
        <Card className="rounded-2xl print:shadow-none">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="font-medium">Overall Compliance</span>
              <span className="font-bold text-blue-600">{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-3" />
          </CardContent>
        </Card>

        {/* Checklist by category */}
        {Object.entries(grouped).map(([category, items]) => (
          <Card key={category} className="rounded-2xl print:shadow-none print:break-inside-avoid">
            <CardContent className="p-5">
              <h3 className="mb-3 text-sm font-semibold">
                {COMPLIANCE_CATEGORY_LABELS[category as ComplianceCategory] || category}
              </h3>
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    {item.status === 'complete' && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />}
                    {item.status === 'flagged' && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />}
                    {item.status === 'pending' && <Circle className="mt-0.5 h-4 w-4 shrink-0 text-neutral-300" />}
                    {item.status === 'not_applicable' && <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-neutral-300" />}
                    <div>
                      <p className={cn(
                        item.status === 'not_applicable' && 'text-neutral-400 line-through'
                      )}>
                        {item.label}
                      </p>
                      {item.notes && (
                        <p className="text-xs text-neutral-400 italic mt-0.5">{item.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Drawing set summary */}
        {reportData.drawings.length > 0 && (
          <Card className="rounded-2xl print:shadow-none print:break-inside-avoid">
            <CardContent className="p-5">
              <h3 className="mb-3 text-sm font-semibold">Drawing Set</h3>
              <p className="mb-3 text-xs text-neutral-500">
                {drawingsReady}/{reportData.drawings.length} drawings ready ({drawingsRequiredComplete}/{drawingsRequired} required)
              </p>
              <div className="space-y-2">
                {reportData.drawings.map((drawing, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    {drawing.is_complete ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4 text-neutral-300" />
                    )}
                    <span>{drawing.drawing_name}</span>
                    {drawing.is_required && !drawing.is_complete && (
                      <Badge variant="secondary" className="rounded-full text-[10px] bg-red-100 text-red-600">
                        Required
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  color = 'text-neutral-700',
}: {
  label: string
  value: number
  icon: React.ElementType
  color?: string
}) {
  return (
    <Card className="rounded-2xl print:shadow-none">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-neutral-400">{label}</p>
          <Icon className={cn('h-4 w-4', color)} />
        </div>
        <p className={cn('text-2xl font-bold', color)}>{value}</p>
      </CardContent>
    </Card>
  )
}
