'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Trash2,
  Send,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface DataCorrection {
  id: string
  field_name: string
  current_value: string
  suggested_value: string
  reason: string
  status: string
  admin_notes: string | null
  created_at: string
}

export default function CorrectionsPage() {
  const params = useParams()
  const [corrections, setCorrections] = useState<DataCorrection[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    field_name: '',
    current_value: '',
    suggested_value: '',
    reason: '',
  })

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      const { data } = await supabase
        .from('data_corrections')
        .select('*')
        .eq('project_id', params.id)
        .order('created_at', { ascending: false })

      setCorrections(data || [])
      setLoading(false)
    }
    fetchData()
  }, [params.id])

  const handleSubmit = async () => {
    if (!form.field_name || !form.suggested_value || !form.reason) {
      toast.error('Please fill in all required fields')
      return
    }

    setSubmitting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('data_corrections')
      .insert({
        project_id: params.id as string,
        user_id: user.id,
        field_name: form.field_name,
        current_value: form.current_value,
        suggested_value: form.suggested_value,
        reason: form.reason,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      toast.error('Failed to submit correction')
    } else {
      toast.success('Correction submitted for review')
      setCorrections((prev) => [data, ...prev])
      setForm({ field_name: '', current_value: '', suggested_value: '', reason: '' })
      setShowForm(false)
    }
    setSubmitting(false)
  }

  const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock },
    approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
    rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
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
          Back to Project
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Data Corrections</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Report incorrect municipality data or compliance rules
            </p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2 rounded-full">
            <Plus className="h-4 w-4" />
            Submit Correction
          </Button>
        </div>
      </div>

      {/* New correction form */}
      {showForm && (
        <Card className="mb-6 rounded-2xl border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Submit a Data Correction</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-neutral-500">
                  What data is incorrect? <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="e.g., Municipality submission email, zoning parameter, fee amount"
                  value={form.field_name}
                  onChange={(e) => setForm((f) => ({ ...f, field_name: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs text-neutral-500">Current (incorrect) value</Label>
                  <Input
                    placeholder="What it currently shows"
                    value={form.current_value}
                    onChange={(e) => setForm((f) => ({ ...f, current_value: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-neutral-500">
                    Correct value <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="What it should be"
                    value={form.suggested_value}
                    onChange={(e) => setForm((f) => ({ ...f, suggested_value: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-neutral-500">
                  Reason / Source <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  placeholder="How do you know this is incorrect? (e.g., confirmed with municipality, official gazette)"
                  value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  className="rounded-xl resize-none"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSubmit} disabled={submitting} className="gap-2 rounded-full">
                  <Send className="h-4 w-4" />
                  {submitting ? 'Submitting...' : 'Submit'}
                </Button>
                <Button variant="ghost" onClick={() => setShowForm(false)} className="rounded-full">
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Corrections list */}
      {corrections.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 py-16 dark:border-neutral-700">
          <AlertTriangle className="mb-3 h-10 w-10 text-neutral-300" />
          <p className="text-sm text-neutral-400">No corrections submitted yet</p>
          <p className="text-xs text-neutral-400 mt-1">
            Help us improve data accuracy by reporting errors
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {corrections.map((correction) => {
            const config = statusConfig[correction.status] || statusConfig.pending
            const StatusIcon = config.icon

            return (
              <Card key={correction.id} className="rounded-xl">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium">{correction.field_name}</p>
                        <Badge variant="secondary" className={cn('gap-1 rounded-full text-xs', config.color)}>
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-neutral-500 mb-2">
                        {correction.current_value && (
                          <>
                            <span className="line-through text-red-400">{correction.current_value}</span>
                            <span>&rarr;</span>
                          </>
                        )}
                        <span className="font-medium text-green-600">{correction.suggested_value}</span>
                      </div>
                      <p className="text-xs text-neutral-400">{correction.reason}</p>
                      {correction.admin_notes && (
                        <p className="mt-2 text-xs text-blue-600 italic">Admin: {correction.admin_notes}</p>
                      )}
                      <p className="mt-1 text-[10px] text-neutral-300">
                        {formatDistanceToNow(new Date(correction.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
