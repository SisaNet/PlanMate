'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { generateChecklist, calculateProgress, groupByCategory } from '@/lib/compliance/engine'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Ban,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Sparkles,
} from 'lucide-react'
import { COMPLIANCE_CATEGORY_LABELS } from '@/types/database'
import type { ComplianceCategory } from '@/types/database'

interface ChecklistItemData {
  id: string
  rule_id: number
  label: string
  description: string | null
  category: string
  status: string
  sort_order: number
  notes: string | null
  is_conditional: boolean
  trigger_label: string | null
}

const statusOptions = [
  { value: 'pending', label: 'Pending', icon: Circle, color: 'text-neutral-400' },
  { value: 'complete', label: 'Complete', icon: CheckCircle2, color: 'text-green-600' },
  { value: 'flagged', label: 'Flagged', icon: AlertTriangle, color: 'text-amber-500' },
  { value: 'not_applicable', label: 'N/A', icon: Ban, color: 'text-neutral-300' },
]

export default function ChecklistPage() {
  const params = useParams()
  const [items, setItems] = useState<ChecklistItemData[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [noteEditing, setNoteEditing] = useState<string | null>(null)
  const [noteValue, setNoteValue] = useState('')
  const [projectName, setProjectName] = useState('')

  const fetchChecklist = useCallback(async () => {
    const supabase = createClient()
    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('id', params.id)
      .single()
    if (project) setProjectName(project.name)

    const { data } = await supabase
      .from('checklist_items')
      .select('*')
      .eq('project_id', params.id)
      .order('sort_order')

    setItems(data || [])
    setLoading(false)

    // Expand all categories by default
    if (data && data.length > 0) {
      const cats = new Set(data.map((i: ChecklistItemData) => i.category))
      setExpandedCategories(cats)
    }
  }, [params.id])

  useEffect(() => {
    fetchChecklist()
  }, [fetchChecklist])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const supabase = createClient()

      // Fetch project and rules
      const [projectRes, rulesRes] = await Promise.all([
        supabase.from('projects').select('*').eq('id', params.id).single(),
        supabase.from('compliance_rules').select('*').order('sort_order'),
      ])

      if (!projectRes.data || !rulesRes.data) throw new Error('Data not found')

      const project = projectRes.data
      const rules = rulesRes.data

      // Generate checklist
      const checklistItems = generateChecklist(rules, project)

      // Delete existing items
      await supabase.from('checklist_items').delete().eq('project_id', params.id as string)

      // Insert new items
      const { error } = await supabase.from('checklist_items').insert(
        checklistItems.map((item) => ({
          ...item,
          project_id: params.id as string,
        }))
      )

      if (error) throw error
      toast.success(`Generated ${checklistItems.length} checklist items`)
      await fetchChecklist()
    } catch (error) {
      toast.error('Failed to generate checklist')
    } finally {
      setGenerating(false)
    }
  }

  const handleStatusChange = async (itemId: string, newStatus: string) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('checklist_items')
      .update({ status: newStatus })
      .eq('id', itemId)

    if (error) {
      toast.error('Failed to update status')
      return
    }

    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, status: newStatus } : item))
    )
  }

  const handleNoteSave = async (itemId: string) => {
    const supabase = createClient()
    await supabase
      .from('checklist_items')
      .update({ notes: noteValue || null })
      .eq('id', itemId)

    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, notes: noteValue || null } : item))
    )
    setNoteEditing(null)
  }

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    )
  }

  const progress = calculateProgress(items)
  const grouped = groupByCategory(items)

  return (
    <div>
      {/* Header */}
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
            <h1 className="text-2xl font-bold tracking-tight">Compliance Checklist</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Track compliance requirements for plan submission
            </p>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={generating}
            variant={items.length === 0 ? 'default' : 'outline'}
            className="gap-2 rounded-full"
          >
            {generating ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {items.length === 0 ? 'Generate Checklist' : 'Regenerate'}
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      {items.length > 0 && (
        <Card className="mb-6 rounded-2xl">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="font-medium">
                {progress.completed} of {progress.total} items complete
              </span>
              <span className="font-bold text-blue-600">{progress.percentage}%</span>
            </div>
            <Progress value={progress.percentage} className="h-2.5" />
            <div className="mt-3 flex gap-4 text-xs text-neutral-400">
              <span className="flex items-center gap-1">
                <Circle className="h-3 w-3 text-neutral-300" />
                {progress.pending} pending
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                {progress.completed} done
              </span>
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-amber-500" />
                {progress.flagged} flagged
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 py-20 dark:border-neutral-700">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950">
            <Sparkles className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">No checklist generated yet</h3>
          <p className="mb-6 max-w-sm text-center text-sm text-neutral-500">
            Generate a compliance checklist based on your project details and municipality requirements.
          </p>
          <Button onClick={handleGenerate} disabled={generating} className="gap-2 rounded-full">
            {generating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate Checklist
          </Button>
        </div>
      )}

      {/* Grouped checklist */}
      <div className="space-y-4">
        {Object.entries(grouped).map(([category, categoryItems]) => {
          const isExpanded = expandedCategories.has(category)
          const catProgress = calculateProgress(categoryItems)
          const categoryLabel = COMPLIANCE_CATEGORY_LABELS[category as ComplianceCategory] || category

          return (
            <Card key={category} className="rounded-2xl overflow-hidden">
              <button
                onClick={() => toggleCategory(category)}
                className="flex w-full items-center justify-between p-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-neutral-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-neutral-400" />
                  )}
                  <div>
                    <h3 className="text-sm font-semibold">{categoryLabel}</h3>
                    <p className="text-xs text-neutral-400">
                      {catProgress.completed}/{catProgress.total} complete
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24">
                    <Progress value={catProgress.percentage} className="h-1.5" />
                  </div>
                  <span className="text-xs font-medium text-neutral-500">
                    {catProgress.percentage}%
                  </span>
                </div>
              </button>

              {isExpanded && (
                <CardContent className="border-t border-neutral-100 p-0 dark:border-neutral-800">
                  <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {categoryItems.map((item) => {
                      const currentStatus = statusOptions.find((s) => s.value === item.status) || statusOptions[0]
                      const StatusIcon = currentStatus.icon

                      return (
                        <div key={item.id} className="px-4 py-3">
                          <div className="flex items-start gap-3">
                            {/* Status cycle button */}
                            <button
                              onClick={() => {
                                const currentIdx = statusOptions.findIndex((s) => s.value === item.status)
                                const nextIdx = (currentIdx + 1) % statusOptions.length
                                handleStatusChange(item.id, statusOptions[nextIdx].value)
                              }}
                              className="mt-0.5 shrink-0"
                              title={`Status: ${currentStatus.label}. Click to cycle.`}
                            >
                              <StatusIcon className={cn('h-5 w-5 transition', currentStatus.color)} />
                            </button>

                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                'text-sm font-medium',
                                item.status === 'complete' && 'line-through text-neutral-400',
                                item.status === 'not_applicable' && 'line-through text-neutral-300'
                              )}>
                                {item.label}
                              </p>
                              {item.description && (
                                <p className="mt-0.5 text-xs text-neutral-400">{item.description}</p>
                              )}
                              {item.is_conditional && item.trigger_label && (
                                <Badge variant="secondary" className="mt-1 rounded-full text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                                  {item.trigger_label}
                                </Badge>
                              )}

                              {/* Notes */}
                              {noteEditing === item.id ? (
                                <div className="mt-2 space-y-2">
                                  <Textarea
                                    value={noteValue}
                                    onChange={(e) => setNoteValue(e.target.value)}
                                    placeholder="Add a note..."
                                    className="rounded-lg text-xs resize-none"
                                    rows={2}
                                  />
                                  <div className="flex gap-2">
                                    <Button size="sm" onClick={() => handleNoteSave(item.id)} className="h-7 rounded-full text-xs">
                                      Save
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setNoteEditing(null)} className="h-7 rounded-full text-xs">
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="mt-1 flex items-center gap-2">
                                  {item.notes && (
                                    <p className="text-xs text-neutral-400 italic">{item.notes}</p>
                                  )}
                                  <button
                                    onClick={() => {
                                      setNoteEditing(item.id)
                                      setNoteValue(item.notes || '')
                                    }}
                                    className="text-xs text-neutral-300 hover:text-blue-500 transition"
                                  >
                                    <MessageSquare className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Quick status buttons */}
                            <div className="hidden sm:flex items-center gap-1">
                              {statusOptions.map((opt) => {
                                const Icon = opt.icon
                                return (
                                  <button
                                    key={opt.value}
                                    onClick={() => handleStatusChange(item.id, opt.value)}
                                    className={cn(
                                      'rounded-lg p-1.5 transition',
                                      item.status === opt.value
                                        ? 'bg-neutral-100 dark:bg-neutral-800'
                                        : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                                    )}
                                    title={opt.label}
                                  >
                                    <Icon className={cn('h-3.5 w-3.5', item.status === opt.value ? opt.color : 'text-neutral-300')} />
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
