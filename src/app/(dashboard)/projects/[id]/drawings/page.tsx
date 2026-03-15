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
import { toast } from 'sonner'
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  AlertTriangle,
  PenTool,
  Sparkles,
  RefreshCw,
} from 'lucide-react'

interface DrawingItem {
  id: string
  drawing_name: string
  description: string | null
  is_required: boolean
  is_complete: boolean
  notes: string | null
  sort_order: number
}

const defaultDrawings = [
  { drawing_name: 'Site Plan', description: 'Showing property boundaries, building footprint, setbacks, access, parking, and services', is_required: true },
  { drawing_name: 'Floor Plans', description: 'All floor levels showing room layouts, dimensions, door/window positions', is_required: true },
  { drawing_name: 'Elevations', description: 'All four elevations showing heights, materials, window/door positions', is_required: true },
  { drawing_name: 'Sections', description: 'Minimum two sections through the building showing structural details', is_required: true },
  { drawing_name: 'Roof Plan', description: 'Showing roof layout, slopes, drainage, and materials', is_required: true },
  { drawing_name: 'Foundation Plan', description: 'Foundation layout with dimensions and specifications', is_required: true },
  { drawing_name: 'Structural Details', description: 'Beam schedules, lintel details, reinforcement details', is_required: true },
  { drawing_name: 'Window & Door Schedule', description: 'Sizes, types, fire ratings, and glass specifications', is_required: true },
  { drawing_name: 'Electrical Layout', description: 'Distribution board, circuits, plug points, lighting, earth leakage', is_required: false },
  { drawing_name: 'Plumbing Layout', description: 'Water supply, drainage, geyser position, vent pipes', is_required: false },
  { drawing_name: 'Stormwater Plan', description: 'Stormwater management and drainage', is_required: false },
  { drawing_name: 'Landscape Plan', description: 'Planting, hard surfaces, boundary walls, swimming pool', is_required: false },
  { drawing_name: 'Fire Protection Plan', description: 'Fire escape routes, hydrant positions, fire walls', is_required: false },
  { drawing_name: 'Disability Access Plan', description: 'Ramps, accessible toilets, signage (SANS 10400-S)', is_required: false },
]

export default function DrawingsPage() {
  const params = useParams()
  const [items, setItems] = useState<DrawingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [projectName, setProjectName] = useState('')

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      const { data: project } = await supabase
        .from('projects')
        .select('name')
        .eq('id', params.id)
        .single()
      if (project) setProjectName(project.name)

      const { data } = await supabase
        .from('drawing_checklist_items')
        .select('*')
        .eq('project_id', params.id)
        .order('sort_order')

      setItems(data || [])
      setLoading(false)
    }
    fetchData()
  }, [params.id])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const supabase = createClient()
      await supabase.from('drawing_checklist_items').delete().eq('project_id', params.id as string)

      const insertItems = defaultDrawings.map((d, i) => ({
        project_id: params.id as string,
        drawing_name: d.drawing_name,
        description: d.description,
        is_required: d.is_required,
        is_complete: false,
        sort_order: i + 1,
      }))

      const { data, error } = await supabase
        .from('drawing_checklist_items')
        .insert(insertItems)
        .select()

      if (error) throw error
      setItems(data || [])
      toast.success(`Generated ${insertItems.length} drawing items`)
    } catch {
      toast.error('Failed to generate drawing checklist')
    } finally {
      setGenerating(false)
    }
  }

  const toggleComplete = async (itemId: string, currentValue: boolean) => {
    const supabase = createClient()
    await supabase
      .from('drawing_checklist_items')
      .update({ is_complete: !currentValue })
      .eq('id', itemId)

    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, is_complete: !currentValue } : item))
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 rounded-2xl" />
        ))}
      </div>
    )
  }

  const completed = items.filter((i) => i.is_complete).length
  const progressPct = items.length > 0 ? Math.round((completed / items.length) * 100) : 0

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
            <h1 className="text-2xl font-bold tracking-tight">Drawing Set Checker</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Track which drawings are ready for submission
            </p>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={generating}
            variant={items.length === 0 ? 'default' : 'outline'}
            className="gap-2 rounded-full"
          >
            {generating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {items.length === 0 ? 'Generate List' : 'Reset'}
          </Button>
        </div>
      </div>

      {items.length > 0 && (
        <Card className="mb-6 rounded-2xl">
          <CardContent className="p-5">
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-medium">{completed}/{items.length} drawings ready</span>
              <span className="font-bold text-blue-600">{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-2" />
          </CardContent>
        </Card>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 py-20 dark:border-neutral-700">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950">
            <PenTool className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">No drawing checklist yet</h3>
          <p className="mb-6 max-w-sm text-center text-sm text-neutral-500">
            Generate a standard drawing set checklist for your project.
          </p>
          <Button onClick={handleGenerate} disabled={generating} className="gap-2 rounded-full">
            Generate List
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Card key={item.id} className="rounded-xl">
              <CardContent className="flex items-center gap-3 p-4">
                <button onClick={() => toggleComplete(item.id, item.is_complete)} className="shrink-0">
                  {item.is_complete ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-neutral-300" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn('text-sm font-medium', item.is_complete && 'line-through text-neutral-400')}>
                      {item.drawing_name}
                    </p>
                    {item.is_required && (
                      <Badge variant="secondary" className="rounded-full text-[10px] bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300">
                        Required
                      </Badge>
                    )}
                  </div>
                  {item.description && (
                    <p className="mt-0.5 text-xs text-neutral-400">{item.description}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
