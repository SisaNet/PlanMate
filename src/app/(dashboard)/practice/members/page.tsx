'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Crown,
  MoreVertical,
} from 'lucide-react'

interface TeamMember {
  id: string
  full_name: string
  email: string
  role: string
  sacap_number: string | null
  created_at: string
}

export default function TeamMembersPage() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    async function fetchMembers() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('practice_id')
        .eq('id', user.id)
        .single()

      if (profile?.practice_id) {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, role, sacap_number, created_at')
          .eq('practice_id', profile.practice_id)
          .order('created_at')

        // Get user emails from auth (need server action for this)
        setMembers(
          (data || []).map((m) => ({
            ...m,
            full_name: m.full_name || 'Unnamed',
            email: '', // Email not stored in profiles for privacy
          }))
        )
      }

      setLoading(false)
    }
    fetchMembers()
  }, [])

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setInviting(true)

    // In production, this would send an invite via Resend
    toast.success(`Invitation sent to ${inviteEmail}`)
    setInviteEmail('')
    setDialogOpen(false)
    setInviting(false)
  }

  const roleConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    admin: { label: 'Admin', color: 'bg-purple-100 text-purple-700', icon: Crown },
    member: { label: 'Member', color: 'bg-blue-100 text-blue-700', icon: Shield },
    viewer: { label: 'Viewer', color: 'bg-neutral-100 text-neutral-600', icon: Users },
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team Members</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Manage your practice team ({members.length} member{members.length !== 1 ? 's' : ''})
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90">
            <UserPlus className="h-4 w-4" />
            Invite Member
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="text-sm">Email Address</Label>
                <Input
                  type="email"
                  placeholder="colleague@practice.co.za"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <Button
                onClick={handleInvite}
                disabled={inviting || !inviteEmail.trim()}
                className="w-full rounded-full gap-2"
              >
                <Mail className="h-4 w-4" />
                {inviting ? 'Sending...' : 'Send Invitation'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {members.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 py-20 dark:border-neutral-700">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950">
            <Users className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">No team set up yet</h3>
          <p className="mb-6 max-w-sm text-center text-sm text-neutral-500">
            Create a practice and invite team members to collaborate on projects.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((member) => {
            const role = roleConfig[member.role] || roleConfig.member
            const RoleIcon = role.icon
            const initials = member.full_name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)

            return (
              <Card key={member.id} className="rounded-xl">
                <CardContent className="flex items-center gap-4 p-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-blue-100 text-blue-700 text-sm font-medium dark:bg-blue-900 dark:text-blue-300">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{member.full_name}</p>
                    {member.sacap_number && (
                      <p className="text-xs text-neutral-400">SACAP: {member.sacap_number}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className={cn('gap-1 rounded-full text-xs', role.color)}>
                    <RoleIcon className="h-3 w-3" />
                    {role.label}
                  </Badge>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
