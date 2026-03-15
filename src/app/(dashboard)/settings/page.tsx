'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Save, User, Bell, Shield, Palette } from 'lucide-react'
import { useTheme } from 'next-themes'

interface Profile {
  id: string
  full_name: string
  email: string
  sacap_number: string | null
  phone: string | null
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { theme, setTheme } = useTheme()
  const [emailNotifications, setEmailNotifications] = useState(true)

  useEffect(() => {
    async function fetchProfile() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        setProfile({
          id: data.id,
          full_name: data.full_name || '',
          email: user.email || '',
          sacap_number: data.sacap_number || '',
          phone: data.phone || '',
        })
      }
      setLoading(false)
    }
    fetchProfile()
  }, [])

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)

    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: profile.full_name,
        sacap_number: profile.sacap_number || null,
        phone: profile.phone || null,
      })
      .eq('id', profile.id)

    if (error) {
      toast.error('Failed to save profile')
    } else {
      toast.success('Profile updated')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Manage your account and preferences
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile */}
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <User className="h-4 w-4 text-neutral-400" />
              <h3 className="text-sm font-semibold">Profile</h3>
            </div>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs text-neutral-500">Full Name</Label>
                  <Input
                    value={profile?.full_name || ''}
                    onChange={(e) => setProfile((p) => p ? { ...p, full_name: e.target.value } : p)}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-neutral-500">Email</Label>
                  <Input
                    value={profile?.email || ''}
                    disabled
                    className="rounded-xl bg-neutral-50 dark:bg-neutral-800"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs text-neutral-500">SACAP Registration No.</Label>
                  <Input
                    value={profile?.sacap_number || ''}
                    onChange={(e) => setProfile((p) => p ? { ...p, sacap_number: e.target.value } : p)}
                    placeholder="e.g., PrA 1234"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-neutral-500">Phone</Label>
                  <Input
                    value={profile?.phone || ''}
                    onChange={(e) => setProfile((p) => p ? { ...p, phone: e.target.value } : p)}
                    placeholder="+27 xxx xxx xxxx"
                    className="rounded-xl"
                  />
                </div>
              </div>
              <Button onClick={handleSave} disabled={saving} className="gap-2 rounded-full">
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Palette className="h-4 w-4 text-neutral-400" />
              <h3 className="text-sm font-semibold">Appearance</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['light', 'dark', 'system'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition ${
                    theme === t
                      ? 'bg-blue-600 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Bell className="h-4 w-4 text-neutral-400" />
              <h3 className="text-sm font-semibold">Notifications</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Email Notifications</p>
                  <p className="text-xs text-neutral-400">Receive email updates about your projects</p>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Deadline Reminders</p>
                  <p className="text-xs text-neutral-400">Get notified before inspection deadlines</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Risk Flag Alerts</p>
                  <p className="text-xs text-neutral-400">Alert when new risk flags apply to your project</p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-neutral-400" />
              <h3 className="text-sm font-semibold">Security</h3>
            </div>
            <div className="space-y-4">
              <Button
                variant="outline"
                className="rounded-full"
                onClick={async () => {
                  const supabase = createClient()
                  const { error } = await supabase.auth.resetPasswordForEmail(
                    profile?.email || '',
                    { redirectTo: `${window.location.origin}/reset-password` }
                  )
                  if (error) {
                    toast.error(error.message || 'Failed to send reset email')
                  } else {
                    toast.success('Password reset email sent — check your inbox')
                  }
                }}
              >
                Change Password
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
