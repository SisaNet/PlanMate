'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  BadgeCheck,
  Search,
  User,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
} from 'lucide-react'

interface SACAPResult {
  registration_number: string
  name: string
  category: string
  status: 'registered' | 'suspended' | 'deregistered' | 'not_found'
  expiry_date: string | null
  discipline: string | null
}

export default function SACAPCheckPage() {
  const [regNumber, setRegNumber] = useState('')
  const [searching, setSearching] = useState(false)
  const [result, setResult] = useState<SACAPResult | null>(null)
  const [searched, setSearched] = useState(false)

  const handleSearch = async () => {
    if (!regNumber.trim()) {
      toast.error('Please enter a registration number')
      return
    }

    setSearching(true)
    setSearched(true)

    // Simulate SACAP lookup (in production, this would call the SACAP API or scrape their portal)
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Demo result based on registration format
    if (regNumber.toUpperCase().startsWith('PRA') || regNumber.toUpperCase().startsWith('PT')) {
      setResult({
        registration_number: regNumber.toUpperCase(),
        name: 'Registered Professional',
        category: regNumber.toUpperCase().startsWith('PRA')
          ? 'Professional Architect'
          : 'Professional Architectural Technologist',
        status: 'registered',
        expiry_date: '2027-03-31',
        discipline: 'Architecture',
      })
    } else if (regNumber.toUpperCase().startsWith('DA') || regNumber.toUpperCase().startsWith('DSA')) {
      setResult({
        registration_number: regNumber.toUpperCase(),
        name: 'Registered Draughtsperson',
        category: 'Senior Architectural Draughtsperson',
        status: 'registered',
        expiry_date: '2026-12-31',
        discipline: 'Architecture',
      })
    } else {
      setResult({
        registration_number: regNumber.toUpperCase(),
        name: '',
        category: '',
        status: 'not_found',
        expiry_date: null,
        discipline: null,
      })
    }

    setSearching(false)
  }

  const statusConfig = {
    registered: { label: 'Registered', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
    suspended: { label: 'Suspended', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
    deregistered: { label: 'Deregistered', color: 'bg-red-100 text-red-700', icon: XCircle },
    not_found: { label: 'Not Found', color: 'bg-neutral-100 text-neutral-600', icon: XCircle },
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">SACAP Registration Check</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Verify that professionals are registered with the South African Council for the
          Architectural Profession
        </p>
      </div>

      {/* Search card */}
      <Card className="mb-6 rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-2">
              <Label htmlFor="reg_number" className="text-sm font-medium">
                SACAP Registration Number
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <Input
                  id="reg_number"
                  placeholder="e.g., PrA 1234, PT 5678, DA 9012"
                  value={regNumber}
                  onChange={(e) => setRegNumber(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10 rounded-xl"
                />
              </div>
              <p className="text-xs text-neutral-400">
                Enter the professional&apos;s SACAP registration number to verify their status.
              </p>
            </div>
            <Button
              onClick={handleSearch}
              disabled={searching}
              className="gap-2 rounded-full"
            >
              {searching ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <BadgeCheck className="h-4 w-4" />
              )}
              Verify
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Result */}
      {searching && (
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-5 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!searching && result && (
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            {result.status === 'not_found' ? (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <XCircle className="h-8 w-8 text-neutral-400" />
                </div>
                <h3 className="mb-1 text-lg font-semibold">Registration Not Found</h3>
                <p className="max-w-sm text-sm text-neutral-500">
                  No SACAP registration found for &quot;{result.registration_number}&quot;.
                  Please verify the number and try again.
                </p>
                <a
                  href="https://www.sacapsa.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                >
                  Check on SACAP website
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            ) : (
              <div>
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950">
                    <User className="h-7 w-7 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{result.name}</h3>
                      {(() => {
                        const config = statusConfig[result.status]
                        const Icon = config.icon
                        return (
                          <Badge
                            variant="secondary"
                            className={`gap-1 rounded-full ${config.color}`}
                          >
                            <Icon className="h-3 w-3" />
                            {config.label}
                          </Badge>
                        )
                      })()}
                    </div>
                    <p className="mt-1 text-sm text-neutral-500">
                      {result.registration_number}
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-neutral-400">Category</p>
                        <p className="text-sm font-medium">{result.category}</p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-400">Discipline</p>
                        <p className="text-sm font-medium">{result.discipline}</p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-400">Valid Until</p>
                        <p className="text-sm font-medium">
                          {result.expiry_date
                            ? new Date(result.expiry_date).toLocaleDateString('en-ZA', { dateStyle: 'long' })
                            : '\u2014'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info card */}
      <Card className="mt-6 rounded-2xl border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
        <CardContent className="p-5">
          <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
            About SACAP Registration
          </h4>
          <ul className="space-y-1 text-xs text-blue-700/70 dark:text-blue-300/70">
            <li>\u2022 All building plan submissions must be prepared by a SACAP-registered professional.</li>
            <li>\u2022 Categories: Professional Architect (PrA), Professional Architectural Technologist (PT), Senior/Architectural Draughtsperson (DSA/DA).</li>
            <li>\u2022 Registration must be current and not suspended at the time of submission.</li>
            <li>\u2022 Municipalities verify SACAP registration as part of the plan scrutiny process.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
