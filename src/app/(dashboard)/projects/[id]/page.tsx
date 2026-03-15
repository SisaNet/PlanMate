'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
  FileCheck,
  Ruler,
  PenTool,
  Zap,
  DollarSign,
  FileText,
  Clock,
  BarChart3,
  MapPin,
  Building2,
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react'
import type { Project, Municipality, BuildingType } from '@/types/database'
import { BUILDING_TYPE_LABELS } from '@/types/database'

interface ProjectWithMunicipality extends Omit<Project, 'municipality'> {
  municipality: Municipality | null
}

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-neutral-100 text-neutral-600' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  ready: { label: 'Ready to Submit', color: 'bg-green-100 text-green-700' },
  submitted: { label: 'Submitted', color: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700' },
}

const projectTabs = [
  { name: 'Checklist', href: 'checklist', icon: FileCheck, description: 'Compliance requirements' },
  { name: 'Parameters', href: 'parameters', icon: Ruler, description: 'Technical checks' },
  { name: 'Drawings', href: 'drawings', icon: PenTool, description: 'Drawing set checker' },
  { name: 'Energy', href: 'energy', icon: Zap, description: 'Energy compliance' },
  { name: 'Fees', href: 'fees', icon: DollarSign, description: 'Fee estimation' },
  { name: 'Documents', href: 'documents', icon: FileText, description: 'Upload & manage' },
  { name: 'Deadlines', href: 'deadlines', icon: Clock, description: 'Track timelines' },
  { name: 'Report', href: 'report', icon: BarChart3, description: 'PDF compliance report' },
]

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [project, setProject] = useState<ProjectWithMunicipality | null>(null)
  const [loading, setLoading] = useState(true)
  const [checklistProgress, setChecklistProgress] = useState({ total: 0, completed: 0 })

  useEffect(() => {
    async function fetchProject() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('projects')
        .select('*, municipality:municipalities(*)')
        .eq('id', params.id)
        .single()

      if (error || !data) {
        router.push('/dashboard/projects')
        return
      }

      setProject(data as ProjectWithMunicipality)

      // Fetch checklist progress
      const { data: items } = await supabase
        .from('checklist_items')
        .select('status')
        .eq('project_id', params.id)

      if (items) {
        setChecklistProgress({
          total: items.length,
          completed: items.filter((i) => i.status === 'complete' || i.status === 'not_applicable').length,
        })
      }

      setLoading(false)
    }
    fetchProject()
  }, [params.id, router])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!project) return null

  const status = statusConfig[project.status] || statusConfig.draft
  const progressPct =
    checklistProgress.total > 0
      ? Math.round((checklistProgress.completed / checklistProgress.total) * 100)
      : 0

  const activeConditions = [
    project.is_coastal && 'Coastal Zone',
    project.is_heritage && 'Heritage Site',
    project.is_addition && 'Addition',
    project.is_sectional_title && 'Sectional Title',
    project.is_communal_land && 'Communal Land',
    project.is_dolomite_zone && 'Dolomite Risk',
  ].filter(Boolean)

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/projects"
          className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 transition hover:text-neutral-700 dark:hover:text-neutral-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
              <Badge
                variant="secondary"
                className={cn('rounded-full text-xs', status.color)}
              >
                {status.label}
              </Badge>
            </div>
            {project.municipality && (
              <div className="mt-1 flex items-center gap-4 text-sm text-neutral-500">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {project.municipality.name}
                </span>
                {project.building_type && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    Class {project.building_type} &ndash;{' '}
                    {BUILDING_TYPE_LABELS[project.building_type as BuildingType]}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overview cards */}
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        {/* Compliance progress */}
        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-neutral-500">Compliance Progress</p>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
            <div className="mb-2 flex items-end gap-1">
              <span className="text-3xl font-bold">{progressPct}%</span>
              <span className="mb-1 text-sm text-neutral-400">
                ({checklistProgress.completed}/{checklistProgress.total})
              </span>
            </div>
            <Progress value={progressPct} className="h-2" />
          </CardContent>
        </Card>

        {/* Project info */}
        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <p className="mb-3 text-sm font-medium text-neutral-500">Project Details</p>
            <div className="space-y-1.5 text-sm">
              {project.street_address && (
                <p className="text-neutral-600 dark:text-neutral-300">{project.street_address}</p>
              )}
              {project.erf_number && (
                <p className="text-neutral-400">Erf: {project.erf_number}</p>
              )}
              {project.gfa_sqm && (
                <p className="text-neutral-400">GFA: {project.gfa_sqm} m\u00B2</p>
              )}
              {project.storeys && (
                <p className="text-neutral-400">{project.storeys} Storey{project.storeys > 1 ? 's' : ''}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Risk flags */}
        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-neutral-500">Special Conditions</p>
              <AlertTriangle className={cn('h-4 w-4', activeConditions.length > 0 ? 'text-amber-500' : 'text-neutral-300')} />
            </div>
            {activeConditions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {activeConditions.map((condition) => (
                  <Badge
                    key={condition as string}
                    variant="secondary"
                    className="rounded-full bg-amber-100 text-xs text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                  >
                    {condition}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-400">No special conditions</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Submission portal link */}
      {project.municipality?.portal_url && (
        <Card className="mb-8 rounded-2xl border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Submission Portal
              </p>
              <p className="text-xs text-blue-600/70 dark:text-blue-400/70">
                {project.municipality.name} online submission system
              </p>
            </div>
            <a
              href={project.municipality.portal_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                variant="outline"
                size="sm"
                className="gap-2 rounded-full border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300"
              >
                Open Portal
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </a>
          </CardContent>
        </Card>
      )}

      {/* Feature tabs grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {projectTabs.map((tab) => (
          <Link key={tab.href} href={`/dashboard/projects/${project.id}/${tab.href}`}>
            <Card className="group h-full rounded-2xl transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-neutral-200/50 dark:hover:shadow-neutral-900/50">
              <CardContent className="p-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 transition-colors group-hover:bg-blue-50 dark:bg-neutral-800 dark:group-hover:bg-blue-950">
                  <tab.icon className="h-5 w-5 text-neutral-500 transition-colors group-hover:text-blue-600" />
                </div>
                <h3 className="text-sm font-semibold transition-colors group-hover:text-blue-600 dark:text-white">
                  {tab.name}
                </h3>
                <p className="mt-0.5 text-xs text-neutral-400">{tab.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
