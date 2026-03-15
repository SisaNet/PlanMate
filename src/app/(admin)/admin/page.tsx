'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, FolderOpen, CreditCard, TrendingUp } from 'lucide-react'

interface Stats {
  totalUsers: number
  totalProjects: number
  proSubscribers: number
  recentUsers: {
    id: string
    full_name: string
    email: string
    plan_tier: string
    created_at: string
  }[]
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      const res = await fetch('/api/admin/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
      setLoading(false)
    }
    fetchStats()
  }, [])

  const statCards = [
    {
      label: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: Users,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
    },
    {
      label: 'Total Projects',
      value: stats?.totalProjects || 0,
      icon: FolderOpen,
      iconColor: 'text-green-600',
      iconBg: 'bg-green-50',
    },
    {
      label: 'Pro Subscribers',
      value: stats?.proSubscribers || 0,
      icon: CreditCard,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-50',
    },
    {
      label: 'Revenue (est.)',
      value: `R${((stats?.proSubscribers || 0) * 499).toLocaleString()}`,
      icon: TrendingUp,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-50',
      isString: true,
    },
  ]

  return (
    <div>
      <div className="mb-6 lg:mb-8">
        <h1 className="text-xl lg:text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-neutral-500">Platform overview and management</p>
      </div>

      {/* Stats */}
      <div className="mb-6 lg:mb-8 grid gap-3 lg:gap-4 grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="bg-white rounded-xl shadow-sm border">
              <CardContent className="p-4 lg:p-6">
                {loading ? (
                  <>
                    <Skeleton className="mb-3 h-10 w-10 rounded-lg" />
                    <Skeleton className="mb-1 h-7 w-12" />
                    <Skeleton className="h-4 w-24" />
                  </>
                ) : (
                  <>
                    <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${stat.iconBg}`}>
                      <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                    </div>
                    <p className="text-xl lg:text-2xl font-bold">
                      {stat.isString ? stat.value : stat.value}
                    </p>
                    <p className="text-xs lg:text-sm text-neutral-500">{stat.label}</p>
                  </>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Signups */}
      <Card className="rounded-xl shadow-sm border">
        <CardContent className="p-4 lg:p-6">
          <h2 className="mb-4 text-base lg:text-lg font-semibold">Recent Signups</h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {stats?.recentUsers.map((u) => (
                <div
                  key={u.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl border p-3 lg:p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{u.full_name || 'Unnamed'}</p>
                    <p className="text-xs text-neutral-400 truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-2 sm:mt-0">
                    <Badge
                      variant="secondary"
                      className={`rounded-full text-xs ${
                        u.plan_tier === 'professional'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      {u.plan_tier}
                    </Badge>
                    <span className="text-xs text-neutral-400">
                      {new Date(u.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
              {stats?.recentUsers.length === 0 && (
                <p className="py-8 text-center text-sm text-neutral-400">No users yet</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
