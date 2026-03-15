'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  CheckCircle2,
  XCircle,
  Database,
  CreditCard,
  Brain,
  Mail,
  BarChart3,
  Globe,
  Key,
  Info,
} from 'lucide-react'

interface ConfigStatus {
  [key: string]: boolean
}

const configItems = [
  {
    key: 'NEXT_PUBLIC_SUPABASE_URL',
    label: 'Supabase URL',
    icon: Database,
    category: 'Database',
    description: 'Your Supabase project URL',
    howTo: 'Available in Supabase Dashboard > Settings > API',
  },
  {
    key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    label: 'Supabase Anon Key',
    icon: Key,
    category: 'Database',
    description: 'Public/anon key for client-side access',
    howTo: 'Available in Supabase Dashboard > Settings > API',
  },
  {
    key: 'SUPABASE_SERVICE_ROLE_KEY',
    label: 'Supabase Service Role Key',
    icon: Key,
    category: 'Database',
    description: 'Server-side key for admin operations',
    howTo: 'Available in Supabase Dashboard > Settings > API (Secret key)',
  },
  {
    key: 'NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY',
    label: 'Paystack Public Key',
    icon: CreditCard,
    category: 'Payments',
    description: 'For client-side checkout initialization',
    howTo: 'Get from Paystack Dashboard > Settings > API Keys & Webhooks',
  },
  {
    key: 'PAYSTACK_SECRET_KEY',
    label: 'Paystack Secret Key',
    icon: CreditCard,
    category: 'Payments',
    description: 'For server-side payment verification',
    howTo: 'Get from Paystack Dashboard > Settings > API Keys & Webhooks',
  },
  {
    key: 'ANTHROPIC_API_KEY',
    label: 'Anthropic API Key',
    icon: Brain,
    category: 'AI Assistant',
    description: 'Powers the AI compliance assistant chat',
    howTo: 'Get from console.anthropic.com > API Keys',
  },
  {
    key: 'RESEND_API_KEY',
    label: 'Resend API Key',
    icon: Mail,
    category: 'Email',
    description: 'For sending transactional emails',
    howTo: 'Get from resend.com > API Keys',
  },
  {
    key: 'NEXT_PUBLIC_POSTHOG_KEY',
    label: 'PostHog Project Key',
    icon: BarChart3,
    category: 'Analytics',
    description: 'For product analytics and feature flags',
    howTo: 'Get from PostHog Dashboard > Project Settings',
  },
  {
    key: 'NEXT_PUBLIC_APP_URL',
    label: 'App URL',
    icon: Globe,
    category: 'App',
    description: 'The public URL of your application',
    howTo: 'Set to your production domain (e.g., https://planmate.co.za)',
  },
]

export default function AdminSettingsPage() {
  const [config, setConfig] = useState<ConfigStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchConfig() {
      const res = await fetch('/api/admin/config')
      if (res.ok) {
        const data = await res.json()
        setConfig(data)
      }
      setLoading(false)
    }
    fetchConfig()
  }, [])

  const configuredCount = config
    ? Object.values(config).filter(Boolean).length
    : 0
  const totalCount = configItems.length

  // Group by category
  const categories = Array.from(new Set(configItems.map((c) => c.category)))

  return (
    <div>
      <div className="mb-6 lg:mb-8">
        <h1 className="text-xl lg:text-2xl font-bold tracking-tight">Platform Settings</h1>
        <p className="mt-1 text-sm text-neutral-500">
          API keys and service configuration status
        </p>
      </div>

      {/* Overall status */}
      <Card className="mb-6 rounded-xl shadow-sm border">
        <CardContent className="p-4 lg:p-6">
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
              configuredCount === totalCount ? 'bg-green-50' : 'bg-amber-50'
            }`}>
              {configuredCount === totalCount ? (
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              ) : (
                <Info className="h-6 w-6 text-amber-600" />
              )}
            </div>
            <div>
              <p className="font-semibold">
                {configuredCount}/{totalCount} services configured
              </p>
              <p className="text-sm text-neutral-500">
                {configuredCount === totalCount
                  ? 'All services are properly configured'
                  : 'Some services still need configuration'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info banner */}
      <Card className="mb-6 rounded-xl border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
        <CardContent className="p-4 lg:p-5">
          <div className="flex gap-3">
            <Info className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                How to configure API keys
              </p>
              <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
                API keys are stored as environment variables for security. In development, add them to{' '}
                <code className="rounded bg-blue-100 px-1 py-0.5 font-mono text-[11px] dark:bg-blue-900">
                  .env.local
                </code>{' '}
                in the project root. In production, set them in your hosting provider&apos;s environment settings (Vercel, Railway, etc.).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Config items by category */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map((category) => (
            <div key={category}>
              <h2 className="mb-3 text-sm font-semibold text-neutral-500 uppercase tracking-wider">
                {category}
              </h2>
              <div className="space-y-2">
                {configItems
                  .filter((c) => c.category === category)
                  .map((item) => {
                    const isConfigured = config?.[item.key] || false
                    const Icon = item.icon

                    return (
                      <Card key={item.key} className="rounded-xl shadow-sm border">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                              isConfigured ? 'bg-green-50' : 'bg-neutral-100'
                            }`}>
                              <Icon className={`h-4 w-4 ${isConfigured ? 'text-green-600' : 'text-neutral-400'}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium">{item.label}</p>
                                {isConfigured ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-400" />
                                )}
                              </div>
                              <p className="text-xs text-neutral-400 mt-0.5">{item.description}</p>
                              {!isConfigured && (
                                <p className="mt-1 text-xs text-amber-600">{item.howTo}</p>
                              )}
                              <p className="mt-1 font-mono text-[10px] text-neutral-300 break-all">
                                {item.key}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
