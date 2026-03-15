'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Bell,
  BellOff,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  FileText,
  Users,
  Trash2,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  is_read: boolean
  created_at: string
  project_id: string | null
  action_url: string | null
}

const typeIcons: Record<string, React.ElementType> = {
  checklist_complete: CheckCircle2,
  deadline_warning: Clock,
  risk_flag: AlertTriangle,
  document_uploaded: FileText,
  team_invite: Users,
  system: Info,
}

const typeColors: Record<string, string> = {
  checklist_complete: 'text-green-600',
  deadline_warning: 'text-amber-500',
  risk_flag: 'text-red-500',
  document_uploaded: 'text-blue-500',
  team_invite: 'text-purple-500',
  system: 'text-neutral-500',
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchNotifications() {
      const supabase = createClient()
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      setNotifications(data || [])
      setLoading(false)
    }
    fetchNotifications()
  }, [])

  const handleMarkAllRead = async () => {
    const supabase = createClient()
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id)
    if (unreadIds.length === 0) return

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds)

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  const handleMarkRead = async (id: string) => {
    const supabase = createClient()
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    )
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={handleMarkAllRead} variant="outline" className="gap-2 rounded-full text-sm">
            <CheckCircle2 className="h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 py-20 dark:border-neutral-700">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800">
            <BellOff className="h-8 w-8 text-neutral-400" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">No notifications</h3>
          <p className="max-w-sm text-center text-sm text-neutral-500">
            You&apos;ll be notified about checklist updates, deadline warnings, and team activity.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => {
            const Icon = typeIcons[notification.type] || Info
            const iconColor = typeColors[notification.type] || 'text-neutral-500'

            return (
              <Card
                key={notification.id}
                className={cn(
                  'rounded-xl transition',
                  !notification.is_read && 'border-blue-200 bg-blue-50/30 dark:border-blue-800 dark:bg-blue-950/10'
                )}
              >
                <CardContent className="flex items-start gap-3 p-4">
                  <div className={cn('mt-0.5 shrink-0', iconColor)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => {
                      if (!notification.is_read) handleMarkRead(notification.id)
                      if (notification.action_url) {
                        window.location.href = notification.action_url
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn('text-sm', !notification.is_read ? 'font-semibold' : 'font-medium')}>
                        {notification.title}
                      </p>
                      {!notification.is_read && (
                        <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-neutral-500">{notification.message}</p>
                    <p className="mt-1 text-[10px] text-neutral-400">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-neutral-400 hover:text-red-500"
                    onClick={() => handleDelete(notification.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
