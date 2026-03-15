'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Building2,
  Users,
  FolderOpen,
  CreditCard,
  Upload,
  Save,
} from 'lucide-react'
import Link from 'next/link'

interface Practice {
  id: string
  name: string
  logo_url: string | null
}

interface PracticeStats {
  memberCount: number
  projectCount: number
}

export default function PracticeSettingsPage() {
  const [practice, setPractice] = useState<Practice | null>(null)
  const [stats, setStats] = useState<PracticeStats>({ memberCount: 0, projectCount: 0 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function fetchPractice() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('practice_id')
        .eq('id', user.id)
        .single()

      if (!profile?.practice_id) {
        setLoading(false)
        return
      }

      const { data: practiceData } = await supabase
        .from('practices')
        .select('id, name, logo_url')
        .eq('id', profile.practice_id)
        .single()

      if (practiceData) {
        setPractice(practiceData)
        setName(practiceData.name)
        setLogoPreview(practiceData.logo_url)
      }

      // Fetch member count
      const { count: memberCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('practice_id', profile.practice_id)

      // Fetch project count
      const { count: projectCount } = await supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('practice_id', profile.practice_id)

      setStats({
        memberCount: memberCount ?? 0,
        projectCount: projectCount ?? 0,
      })

      setLoading(false)
    }
    fetchPractice()
  }, [])

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLogoFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => {
      setLogoPreview(ev.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!practice) return
    setSaving(true)

    try {
      const supabase = createClient()
      let logoUrl = practice.logo_url

      // Upload logo if a new file was selected
      if (logoFile) {
        const ext = logoFile.name.split('.').pop()
        const path = `practice-logos/${practice.id}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('assets')
          .upload(path, logoFile, { upsert: true })

        if (uploadError) {
          toast.error('Failed to upload logo')
          setSaving(false)
          return
        }

        const { data: publicUrl } = supabase.storage
          .from('assets')
          .getPublicUrl(path)

        logoUrl = publicUrl.publicUrl
      }

      const { error } = await supabase
        .from('practices')
        .update({ name, logo_url: logoUrl })
        .eq('id', practice.id)

      if (error) {
        toast.error('Failed to save practice settings')
      } else {
        setPractice({ ...practice, name, logo_url: logoUrl })
        setLogoFile(null)
        toast.success('Practice settings saved')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
    )
  }

  if (!practice) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 py-20 dark:border-neutral-700">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950">
          <Building2 className="h-8 w-8 text-blue-600" />
        </div>
        <h3 className="mb-2 text-lg font-semibold">No practice found</h3>
        <p className="max-w-sm text-center text-sm text-neutral-500">
          You are not associated with a practice yet. Create or join one to get started.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Practice Settings</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Manage your practice profile and preferences
        </p>
      </div>

      {/* Practice details */}
      <Card className="mb-6 rounded-2xl">
        <CardContent className="space-y-6 p-6">
          {/* Logo upload */}
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 transition-colors hover:border-primary dark:border-neutral-700 dark:bg-neutral-900"
            >
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Practice logo"
                  className="h-full w-full object-cover"
                />
              ) : (
                <Upload className="h-6 w-6 text-neutral-400" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="hidden"
            />
            <div>
              <p className="text-sm font-medium">Practice Logo</p>
              <p className="text-xs text-neutral-500">
                Click to upload. Recommended size: 256x256px.
              </p>
            </div>
          </div>

          {/* Practice name */}
          <div className="space-y-2">
            <Label className="text-sm">Practice Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your practice name"
              className="rounded-xl"
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || (!logoFile && name === practice.name)}
            className="gap-2 rounded-full"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <Card className="rounded-2xl">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.memberCount}</p>
              <p className="text-xs text-neutral-500">Team Members</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950">
              <FolderOpen className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.projectCount}</p>
              <p className="text-xs text-neutral-500">Projects</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/practice/members">
          <Card className="rounded-2xl transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900">
            <CardContent className="flex items-center gap-4 p-5">
              <Users className="h-5 w-5 text-neutral-500" />
              <div>
                <p className="text-sm font-medium">Members</p>
                <p className="text-xs text-neutral-500">Manage your team</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/practice/billing">
          <Card className="rounded-2xl transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900">
            <CardContent className="flex items-center gap-4 p-5">
              <CreditCard className="h-5 w-5 text-neutral-500" />
              <div>
                <p className="text-sm font-medium">Billing</p>
                <p className="text-xs text-neutral-500">Subscription & invoices</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
