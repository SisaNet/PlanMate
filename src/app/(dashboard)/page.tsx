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
  ArrowRight,
  FileText,
  Clock,
  CheckCircle2,
  Send,
} from 'lucide-react'

interface Project {
  id: string
  name: string
  status: string
  street_address: string
  created_at: string
  municipality: {
    name: string
  } | null
}

interface Stats {
  total: number
  pending: number
  ready: number
  submitted: number
}

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-neutral-100 text-neutral-600' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  ready: { label: 'Ready', color: 'bg-green-100 text-green-700' },
  submitted: { label: 'Submitted', color: 'bg-purple-100 text-purple-700' },
  approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700' },
}

export default function DashboardPage() {
  const [userName, setUserName] = useState<string>('')
  const [projects, setProjects] = useState<Project[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, ready: 0, submitted: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()

      // Fetch user info
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const name =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split('@')[0] ||
          'there'
        setUserName(name)
      }

      // Fetch all projects for stats
      const { data: allProjects } = await supabase
        .from('projects')
        .select('id, name, status, street_address, created_at, municipality:municipalities(name)')
        .order('created_at', { ascending: false })

      const projectList = (allProjects || []).map((p: Record<string, unknown>) => ({
        ...p,
        municipality: Array.isArray(p.municipality) ? p.municipality[0] || null : p.municipality,
      })) as Project[]
      setProjects(projectList.slice(0, 5))

      setStats({
        total: projectList.length,
        pending: projectList.filter((p) => p.status === 'draft' || p.status === 'in_progress').length,
        ready: projectList.filter((p) => p.status === 'ready').length,
        submitted: projectList.filter((p) => p.status === 'submitted').length,
      })

      setLoading(false)
    }
    fetchData()
  }, [])

  const statCards = [
    {
      label: 'Total Projects',
      value: stats.total,
      icon: FileText,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
    },
    {
      label: 'Pending Items',
      value: stats.pending,
      icon: Clock,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-50',
    },
    {
      label: 'Ready for Submission',
      value: stats.ready,
      icon: CheckCircle2,
      iconColor: 'text-green-600',
      iconBg: 'bg-green-50',
    },
    {
      label: 'Submitted',
      value: stats.submitted,
      icon: Send,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-50',
    },
  ]

  return (
    <div>
      {/* Welcome Header */}
      <div className="mb-8">
        {loading ? (
          <>
            <Skeleton className="mb-2 h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome back, {userName}
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Here&apos;s an overview of your projects
            </p>
          </>
        )}
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card
              key={stat.label}
              className="bg-white rounded-xl shadow-sm border"
            >
              <CardContent className="p-6">
                {loading ? (
                  <>
                    <Skeleton className="mb-3 h-10 w-10 rounded-lg" />
                    <Skeleton className="mb-1 h-7 w-12" />
                    <Skeleton className="h-4 w-24" />
                  </>
                ) : (
                  <>
                    <div
                      className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${stat.iconBg}`}
                    >
                      <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                    </div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-neutral-500">{stat.label}</p>
                  </>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="mb-8 flex gap-3">
        <Link href="/projects/new">
          <Button className="rounded-full gap-2">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </Link>
        <Link href="/projects">
          <Button variant="outline" className="rounded-full gap-2">
            <FolderOpen className="h-4 w-4" />
            View All Projects
          </Button>
        </Link>
      </div>

      {/* Recent Projects */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Projects</h2>
          {projects.length > 0 && (
            <Link
              href="/projects"
              className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-white rounded-xl shadow-sm border">
                <CardContent className="flex items-center justify-between p-5">
                  <div className="flex-1">
                    <Skeleton className="mb-2 h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-5 w-20 rounded-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <Card className="bg-white rounded-xl shadow-sm border">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
                <FolderOpen className="h-7 w-7 text-blue-600" />
              </div>
              <h3 className="mb-1 text-base font-semibold">No projects yet</h3>
              <p className="mb-5 max-w-sm text-center text-sm text-neutral-500">
                Create your first project to start checking building plan compliance.
              </p>
              <Link href="/projects/new">
                <Button className="rounded-full gap-2">
                  <Plus className="h-4 w-4" />
                  Create your first project
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => {
              const status = statusConfig[project.status] || statusConfig.draft
              return (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <Card className="group bg-white rounded-xl shadow-sm border transition-all hover:-translate-y-0.5 hover:shadow-md">
                    <CardContent className="flex items-center justify-between p-5">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium group-hover:text-blue-600 transition-colors truncate">
                          {project.name}
                        </h3>
                        <p className="mt-0.5 text-sm text-neutral-400 truncate">
                          {project.municipality?.name}
                          {project.municipality?.name && project.street_address && ' · '}
                          {project.street_address}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={`${status.color} ml-4 shrink-0 rounded-full text-xs`}
                      >
                        {status.label}
                      </Badge>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
