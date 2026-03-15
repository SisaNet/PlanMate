'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { CreditCard, Users } from 'lucide-react'

interface Subscriber {
  id: string
  full_name: string
  email: string
  plan_tier: string
  paystack_customer_code: string | null
  paystack_subscription_code: string | null
  created_at: string
}

export default function AdminSubscriptionsPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSubscribers() {
      const res = await fetch('/api/admin/users')
      if (res.ok) {
        const data = await res.json()
        setSubscribers(data.filter((u: Subscriber) => u.plan_tier === 'professional'))
      }
      setLoading(false)
    }
    fetchSubscribers()
  }, [])

  return (
    <div>
      <div className="mb-6 lg:mb-8">
        <h1 className="text-xl lg:text-2xl font-bold tracking-tight">Subscriptions</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Professional plan subscribers
        </p>
      </div>

      {/* Summary */}
      <div className="mb-6 grid gap-3 lg:gap-4 grid-cols-2">
        <Card className="rounded-xl shadow-sm border">
          <CardContent className="p-4 lg:p-6">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-xl lg:text-2xl font-bold">{loading ? '—' : subscribers.length}</p>
            <p className="text-xs lg:text-sm text-neutral-500">Active Subscribers</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-sm border">
          <CardContent className="p-4 lg:p-6">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
              <CreditCard className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-xl lg:text-2xl font-bold">
              {loading ? '—' : `R${(subscribers.length * 499).toLocaleString()}`}
            </p>
            <p className="text-xs lg:text-sm text-neutral-500">Monthly Revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Subscribers List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : subscribers.length === 0 ? (
        <Card className="rounded-xl shadow-sm border">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CreditCard className="mb-4 h-12 w-12 text-neutral-200" />
            <p className="text-sm text-neutral-400">No professional subscribers yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {subscribers.map((sub) => (
            <Card key={sub.id} className="rounded-xl shadow-sm border">
              <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 lg:p-5 gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{sub.full_name || 'Unnamed'}</p>
                  <p className="text-xs text-neutral-400 truncate">{sub.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700 rounded-full text-xs">
                    Professional
                  </Badge>
                  <span className="text-xs text-neutral-400">
                    Since {new Date(sub.created_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
