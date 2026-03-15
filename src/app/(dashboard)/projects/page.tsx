'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Plus,
  FolderOpen,
  MapPin,
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from 'lucide-react'

interface Project {
  id: string
  name: string
  street_address: string
  status: string
  building_type: string
  gfa_sqm: number
  created_at: string
  municipality: {
    name: string
  } | null
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: 'Draft', color: 'bg-neutral-100 text-neutral-600', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700', icon: Clock },
  ready: { label: 'Ready', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  submitted: { label: 'Submitted', color: 'bg-amber-100 text-amber-700', icon: Clock },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
}

const buildingTypes: Record<string, string> = {
  A: 'Entertainment & Assembly',
  B: 'High Risk Commercial',
  C: 'Exhibition Hall',
  D: 'Industrial',
  E: 'Residential (Dwelling)',
  F: 'Large Shop',
  G: 'Office',
  H: 'Hotel / Dormitory',
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProjects() {
      const supabase = createClient()
      const { data } = await supabase
        .from('projects')
        .select('*, municipality:municipalities(name)')
        .order('created_at', { ascending: false })

      setProjects(data || [])
      setLoading(false)
    }
    fetchProjects()
  }, [])

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Manage your building plan compliance checks
          </p>
        </div>
        <Link href="/projects/new">
          <Button className="rounded-full gap-2">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="rounded-2xl">
              <CardContent className="p-6">
                <Skeleton className="mb-4 h-6 w-3/4" />
                <Skeleton className="mb-2 h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white py-20 dark:border-neutral-700 dark:bg-neutral-900">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950">
            <FolderOpen className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">No projects yet</h3>
          <p className="mb-6 max-w-sm text-center text-sm text-neutral-500">
            Create your first project to start checking building plan compliance
            against municipality requirements.
          </p>
          <Link href="/projects/new">
            <Button className="rounded-full gap-2">
              <Plus className="h-4 w-4" />
              Create your first project
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const status = statusConfig[project.status] || statusConfig.draft
            const StatusIcon = status.icon
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
              >
                <Card className="group rounded-2xl transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-neutral-200/50 dark:hover:shadow-neutral-900/50">
                  <CardContent className="p-6">
                    <div className="mb-3 flex items-start justify-between">
                      <h3 className="font-semibold group-hover:text-blue-600 transition-colors">
                        {project.name}
                      </h3>
                      <Badge variant="secondary" className={`${status.color} rounded-full text-xs`}>
                        <StatusIcon className="mr-1 h-3 w-3" />
                        {status.label}
                      </Badge>
                    </div>
                    {project.municipality && (
                      <div className="mb-2 flex items-center gap-1.5 text-sm text-neutral-500">
                        <MapPin className="h-3.5 w-3.5" />
                        {project.municipality.name}
                      </div>
                    )}
                    {project.street_address && (
                      <p className="mb-2 text-sm text-neutral-400 truncate">
                        {project.street_address}
                      </p>
                    )}
                    <div className="mt-4 flex items-center gap-4 text-xs text-neutral-400">
                      {project.building_type && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          Class {project.building_type}
                        </span>
                      )}
                      {project.gfa_sqm && (
                        <span>{project.gfa_sqm} m²</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
