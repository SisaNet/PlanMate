'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Search, Shield, ShieldOff, Crown, User as UserIcon } from 'lucide-react'

interface UserProfile {
  id: string
  full_name: string
  email: string
  role: string
  plan_tier: string
  is_super_admin: boolean
  created_at: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)

  async function fetchUsers() {
    const res = await fetch('/api/admin/users')
    if (res.ok) {
      const data = await res.json()
      setUsers(data)
    }
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  async function updateUser(userId: string, updates: Record<string, unknown>) {
    setUpdating(userId)
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, updates }),
    })
    if (res.ok) {
      toast.success('User updated')
      await fetchUsers()
    } else {
      toast.error('Failed to update user')
    }
    setUpdating(null)
  }

  const filtered = users.filter(
    (u) =>
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="mb-6 lg:mb-8">
        <h1 className="text-xl lg:text-2xl font-bold tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Manage all platform users ({users.length} total)
        </p>
      </div>

      {/* Search */}
      <div className="mb-4 lg:mb-6 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <Input
          placeholder="Search users by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 rounded-xl"
        />
      </div>

      {/* Users List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((user) => (
            <Card key={user.id} className="rounded-xl shadow-sm border">
              <CardContent className="p-4 lg:p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      user.is_super_admin ? 'bg-red-100' : 'bg-blue-100'
                    }`}>
                      {user.is_super_admin ? (
                        <Crown className="h-5 w-5 text-red-600" />
                      ) : (
                        <UserIcon className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-sm truncate">{user.full_name || 'Unnamed'}</p>
                        {user.is_super_admin && (
                          <Badge variant="secondary" className="bg-red-100 text-red-700 rounded-full text-[10px]">
                            Super Admin
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 truncate">{user.email}</p>
                      <p className="text-xs text-neutral-300 mt-0.5">
                        Joined {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Plan toggle */}
                    <Button
                      size="sm"
                      variant={user.plan_tier === 'professional' ? 'default' : 'outline'}
                      className="rounded-full text-xs h-8"
                      disabled={updating === user.id}
                      onClick={() =>
                        updateUser(user.id, {
                          plan_tier: user.plan_tier === 'professional' ? 'free' : 'professional',
                        })
                      }
                    >
                      {user.plan_tier === 'professional' ? 'Pro' : 'Free'}
                    </Button>

                    {/* Admin toggle */}
                    <Button
                      size="sm"
                      variant="outline"
                      className={`rounded-full text-xs h-8 gap-1 ${
                        user.is_super_admin ? 'border-red-200 text-red-600' : ''
                      }`}
                      disabled={updating === user.id}
                      onClick={() =>
                        updateUser(user.id, {
                          is_super_admin: !user.is_super_admin,
                        })
                      }
                    >
                      {user.is_super_admin ? (
                        <>
                          <ShieldOff className="h-3 w-3" />
                          <span className="hidden sm:inline">Remove Admin</span>
                        </>
                      ) : (
                        <>
                          <Shield className="h-3 w-3" />
                          <span className="hidden sm:inline">Make Admin</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-sm text-neutral-400">No users found</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
