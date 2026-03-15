'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  CreditCard,
  Check,
  Zap,
  Crown,
  ArrowRight,
  ExternalLink,
  Shield,
} from 'lucide-react'

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: '',
    description: 'For individual professionals getting started',
    features: [
      'Up to 5 projects',
      'Basic compliance checklist',
      'Municipality selector',
      'Drawing set checker',
      'Email support',
    ],
    limitations: [
      'No AI assistant',
      'No team collaboration',
      'No PDF reports',
    ],
    icon: Zap,
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 499,
    period: '/month',
    description: 'For practices needing full compliance tools',
    features: [
      'Unlimited projects',
      'Full compliance engine',
      'AI compliance assistant',
      'PDF compliance reports',
      'Up to 20 team members',
      'Energy & fee calculators',
      'Document management',
      'Priority support',
      'SACAP registration checker',
      'Portal link checker',
    ],
    limitations: [],
    icon: Crown,
  },
]

export default function BillingPage() {
  const [currentPlan, setCurrentPlan] = useState('free')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSubscription() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('plan_tier')
        .eq('id', user.id)
        .single()

      if (data) {
        setCurrentPlan(data.plan_tier || 'free')
      }
      setLoading(false)
    }
    fetchSubscription()
  }, [])

  const handleSubscribe = async () => {
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'professional' }),
      })

      const data = await response.json()
      if (data.authorization_url) {
        window.location.href = data.authorization_url
      } else {
        toast.error('Failed to initialize payment')
      }
    } catch {
      toast.error('Failed to start checkout')
    }
  }

  const handleManageSubscription = async () => {
    toast.info('Redirecting to Paystack customer portal...')
    // In production: redirect to Paystack customer portal
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Billing & Plan</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Manage your subscription and payment details
        </p>
      </div>

      {/* Current plan badge */}
      <Card className="mb-6 rounded-2xl border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Current Plan: {currentPlan === 'professional' ? 'Professional' : 'Free'}
              </p>
              <p className="text-xs text-blue-600/70 dark:text-blue-400/70">
                {currentPlan === 'professional'
                  ? 'You have access to all features'
                  : 'Upgrade to unlock all features'}
              </p>
            </div>
          </div>
          {currentPlan === 'professional' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleManageSubscription}
              className="gap-1 rounded-full border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300"
            >
              Manage
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Plan cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {plans.map((plan) => {
          const isCurrentPlan = currentPlan === plan.id
          const Icon = plan.icon

          return (
            <Card
              key={plan.id}
              className={cn(
                'rounded-2xl transition-all',
                isCurrentPlan && 'ring-2 ring-blue-600',
                plan.id === 'professional' && !isCurrentPlan && 'border-blue-200 dark:border-blue-800'
              )}
            >
              <CardContent className="p-6">
                <div className="mb-4 flex items-center gap-2">
                  <div className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-xl',
                    plan.id === 'professional'
                      ? 'bg-blue-100 dark:bg-blue-900'
                      : 'bg-neutral-100 dark:bg-neutral-800'
                  )}>
                    <Icon className={cn(
                      'h-5 w-5',
                      plan.id === 'professional' ? 'text-blue-600' : 'text-neutral-500'
                    )} />
                  </div>
                  {isCurrentPlan && (
                    <Badge variant="secondary" className="rounded-full bg-blue-100 text-blue-700 text-xs">
                      Current
                    </Badge>
                  )}
                </div>

                <h3 className="text-lg font-bold">{plan.name}</h3>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-3xl font-bold">
                    {plan.price === 0 ? 'R0' : `R${plan.price}`}
                  </span>
                  {plan.period && (
                    <span className="text-sm text-neutral-500">{plan.period}</span>
                  )}
                </div>
                <p className="mt-2 text-xs text-neutral-500">{plan.description}</p>

                <Separator className="my-4" />

                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 shrink-0 text-green-600" />
                      {feature}
                    </li>
                  ))}
                  {plan.limitations.map((limitation) => (
                    <li key={limitation} className="flex items-center gap-2 text-sm text-neutral-400">
                      <span className="h-4 w-4 shrink-0 text-center">&ndash;</span>
                      {limitation}
                    </li>
                  ))}
                </ul>

                <div className="mt-6">
                  {plan.id === 'free' ? (
                    isCurrentPlan ? (
                      <Button disabled variant="outline" className="w-full rounded-full">
                        Current Plan
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full rounded-full">
                        Downgrade
                      </Button>
                    )
                  ) : isCurrentPlan ? (
                    <Button disabled variant="outline" className="w-full rounded-full">
                      Current Plan
                    </Button>
                  ) : (
                    <Button onClick={handleSubscribe} className="w-full gap-2 rounded-full">
                      Upgrade to Professional
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Payment info */}
      <Card className="mt-6 rounded-2xl">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="h-4 w-4 text-neutral-400" />
            <h3 className="text-sm font-semibold">Payment</h3>
          </div>
          <p className="text-xs text-neutral-500">
            Payments are processed securely via Paystack. All amounts are in South African Rand (ZAR).
            You can cancel your subscription at any time from the management portal.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
