'use client'

import { useEffect, useState } from 'react'
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
  Clock,
  Plus,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Trash2,
} from 'lucide-react'
import { differenceInDays, format, isPast, isToday } from 'date-fns'

interface InspectionStage {
  id: string
  project_id: string
  stage_name: string
  scheduled_date: string | null
  completed_date: string | null
  status: string
  notes: string | null
  sort_order: number
}

const defaultStages = [
  'Foundation Inspection',
  'Slab Inspection',
  'Wall Plate Inspection',
  'Roof Inspection',
  'Drainage Inspection',
  'Final / Occupation Inspection',
]

export default function DeadlinesPage() {
  const params = useParams()
  const [stages, setStages] = useState<InspectionStage[]>([])
  const [loading, setLoading] = useState(true)
  const [submissionDate, setSubmissionDate] = useState('')
  const [projectName, setProjectName] = useState('')

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      const { data: project } = await supabase
        .from('projects')
        .select('name, submitted_at')
        .eq('id', params.id)
        .single()

      if (project) {
        setProjectName(project.name)
        setSubmissionDate(project.submitted_at || '')
      }

      const { data } = await supabase
        .from('inspection_stages')
        .select('*')
        .eq('project_id', params.id)
        .order('sort_order')

      setStages(data || [])
      setLoading(false)
    }
    fetchData()
  }, [params.id])

  const handleGenerateStages = async () => {
    const supabase = createClient()
    await supabase.from('inspection_stages').delete().eq('project_id', params.id as string)

    const items = defaultStages.map((name, i) => ({
      project_id: params.id as string,
      stage_name: name,
      status: 'pending',
      sort_order: i + 1,
    }))

    const { data, error } = await supabase
      .from('inspection_stages')
      .insert(items)
      .select()

    if (error) {
      toast.error('Failed to generate stages')
      return
    }

    setStages(data || [])
    toast.success('Inspection stages created')
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    const supabase = createClient()
    const updates: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'completed') {
      updates.completed_date = new Date().toISOString()
    }

    await supabase.from('inspection_stages').update(updates).eq('id', id)
    setStages((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: newStatus, ...(newStatus === 'completed' ? { completed_date: new Date().toISOString() } : {}) } : s))
    )
  }

  const handleDateChange = async (id: string, date: string) => {
    const supabase = createClient()
    await supabase
      .from('inspection_stages')
      .update({ scheduled_date: date || null })
      .eq('id', id)

    setStages((prev) =>
      prev.map((s) => (s.id === id ? { ...s, scheduled_date: date || null } : s))
    )
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    await supabase.from('inspection_stages').delete().eq('id', id)
    setStages((prev) => prev.filter((s) => s.id !== id))
  }

  // Calculate 30-day plan validity warning
  const daysUntilExpiry = submissionDate
    ? 180 - differenceInDays(new Date(), new Date(submissionDate))
    : null

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/dashboard/projects/${params.id}`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
        >
          <ArrowLeft className="h-4 w-4" />
          {projectName || 'Back to Project'}
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Deadlines & Inspections</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Track inspection stages and key dates
            </p>
          </div>
          {stages.length === 0 && (
            <Button onClick={handleGenerateStages} className="gap-2 rounded-full">
              <Plus className="h-4 w-4" />
              Generate Stages
            </Button>
          )}
        </div>
      </div>

      {/* Plan validity warning */}
      {daysUntilExpiry !== null && (
        <Card className={cn(
          'mb-6 rounded-2xl',
          daysUntilExpiry <= 30
            ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950/20'
            : daysUntilExpiry <= 60
            ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/20'
            : 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950/20'
        )}>
          <CardContent className="flex items-center gap-3 p-4">
            <Clock className={cn(
              'h-5 w-5',
              daysUntilExpiry <= 30 ? 'text-red-500' : daysUntilExpiry <= 60 ? 'text-amber-500' : 'text-green-500'
            )} />
            <div>
              <p className="text-sm font-medium">
                Plan Approval Validity: {daysUntilExpiry > 0 ? `${daysUntilExpiry} days remaining` : 'Expired'}
              </p>
              <p className="text-xs text-neutral-500">
                Building plans are typically valid for 12 months from approval date.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submission date */}
      <Card className="mb-6 rounded-2xl">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-neutral-400" />
            <h3 className="text-sm font-semibold">Plan Submission Date</h3>
          </div>
          <Input
            type="date"
            value={submissionDate ? submissionDate.split('T')[0] : ''}
            onChange={async (e) => {
              setSubmissionDate(e.target.value)
              const supabase = createClient()
              await supabase.from('projects').update({ submitted_at: e.target.value || null }).eq('id', params.id)
            }}
            className="max-w-xs rounded-xl"
          />
        </CardContent>
      </Card>

      {/* Inspection stages timeline */}
      {stages.length > 0 && (
        <div className="space-y-3">
          {stages.map((stage, index) => {
            const isOverdue = stage.scheduled_date && isPast(new Date(stage.scheduled_date)) && stage.status !== 'completed'
            const isDueToday = stage.scheduled_date && isToday(new Date(stage.scheduled_date))

            return (
              <Card key={stage.id} className={cn(
                'rounded-xl transition',
                isOverdue && 'border-red-200 dark:border-red-800',
                isDueToday && 'border-blue-200 dark:border-blue-800',
              )}>
                <CardContent className="flex items-center gap-4 p-4">
                  {/* Status indicator */}
                  <button
                    onClick={() => {
                      const next = stage.status === 'pending' ? 'completed' : 'pending'
                      handleStatusChange(stage.id, next)
                    }}
                    className="shrink-0"
                  >
                    {stage.status === 'completed' ? (
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    ) : isOverdue ? (
                      <XCircle className="h-6 w-6 text-red-500" />
                    ) : (
                      <div className="h-6 w-6 rounded-full border-2 border-neutral-300 dark:border-neutral-600" />
                    )}
                  </button>

                  {/* Timeline line */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={cn(
                          'text-sm font-medium',
                          stage.status === 'completed' && 'line-through text-neutral-400'
                        )}>
                          {stage.stage_name}
                        </p>
                        {stage.scheduled_date && (
                          <p className="text-xs text-neutral-400 mt-0.5">
                            {format(new Date(stage.scheduled_date), 'dd MMM yyyy')}
                            {isOverdue && (
                              <span className="ml-2 text-red-500 font-medium">Overdue</span>
                            )}
                            {isDueToday && (
                              <span className="ml-2 text-blue-500 font-medium">Today</span>
                            )}
                          </p>
                        )}
                        {stage.completed_date && (
                          <p className="text-xs text-green-600 mt-0.5">
                            Completed {format(new Date(stage.completed_date), 'dd MMM yyyy')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="date"
                          value={stage.scheduled_date?.split('T')[0] || ''}
                          onChange={(e) => handleDateChange(stage.id, e.target.value)}
                          className="h-8 w-36 rounded-lg text-xs"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-neutral-400 hover:text-red-500"
                          onClick={() => handleDelete(stage.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {stages.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 py-16 dark:border-neutral-700">
          <Clock className="mb-3 h-10 w-10 text-neutral-300" />
          <p className="text-sm text-neutral-400">No inspection stages set up yet</p>
          <Button onClick={handleGenerateStages} variant="outline" className="mt-4 gap-2 rounded-full">
            <Plus className="h-4 w-4" />
            Generate Default Stages
          </Button>
        </div>
      )}
    </div>
  )
}
