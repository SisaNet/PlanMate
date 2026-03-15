'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, DollarSign, Calculator, Info } from 'lucide-react'

interface FeeSchedule {
  id: number
  municipality_id: number
  building_type: string | null
  fee_per_sqm: number
  min_fee: number
  plan_scrutiny_fee: number | null
  building_inspection_fee: number | null
  sundry_fee: number | null
  effective_date: string
}

export default function FeesPage() {
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [feeSchedule, setFeeSchedule] = useState<FeeSchedule | null>(null)
  const [gfa, setGfa] = useState<number>(0)
  const [municipalityName, setMunicipalityName] = useState('')

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      const { data: project } = await supabase
        .from('projects')
        .select('gfa_sqm, municipality_id, municipality:municipalities(name)')
        .eq('id', params.id)
        .single()

      if (project) {
        setGfa(project.gfa_sqm || 0)
        const mun = project.municipality as unknown as { name: string } | null
        setMunicipalityName(mun?.name || '')

        if (project.municipality_id) {
          const { data: fees } = await supabase
            .from('fee_schedules')
            .select('*')
            .eq('municipality_id', project.municipality_id)
            .order('effective_date', { ascending: false })
            .limit(1)
            .single()
          setFeeSchedule(fees)
        }
      }
      setLoading(false)
    }
    fetchData()
  }, [params.id])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    )
  }

  const buildingFee = feeSchedule
    ? Math.max(gfa * feeSchedule.fee_per_sqm, feeSchedule.min_fee)
    : 0
  const scrutinyFee = feeSchedule?.plan_scrutiny_fee || 0
  const inspectionFee = feeSchedule?.building_inspection_fee || 0
  const sundryFee = feeSchedule?.sundry_fee || 0
  const totalFee = buildingFee + scrutinyFee + inspectionFee + sundryFee
  const vat = totalFee * 0.15
  const grandTotal = totalFee + vat

  const formatZAR = (amount: number) =>
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount)

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/dashboard/projects/${params.id}`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Project
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Fee Estimation</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Estimated building plan submission fees
          {municipalityName && ` for ${municipalityName}`}
        </p>
      </div>

      {!feeSchedule ? (
        <Card className="rounded-2xl border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
          <CardContent className="flex items-start gap-3 p-5">
            <Info className="h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Fee schedule not available
              </p>
              <p className="mt-1 text-xs text-amber-600/70 dark:text-amber-400/70">
                No fee schedule has been configured for this municipality yet. Contact the municipality directly for current fees.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* GFA Input */}
          <Card className="rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="h-4 w-4 text-neutral-400" />
                <h3 className="text-sm font-semibold">Floor Area</h3>
              </div>
              <div className="max-w-xs space-y-2">
                <Label className="text-xs text-neutral-500">Gross Floor Area (m\u00B2)</Label>
                <Input
                  type="number"
                  value={gfa || ''}
                  onChange={(e) => setGfa(parseFloat(e.target.value) || 0)}
                  className="rounded-xl"
                  min={0}
                />
              </div>
            </CardContent>
          </Card>

          {/* Fee breakdown */}
          <Card className="rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="h-4 w-4 text-neutral-400" />
                <h3 className="text-sm font-semibold">Fee Breakdown</h3>
              </div>
              <div className="space-y-3">
                <FeeRow
                  label={`Building plan fee (${gfa} m\u00B2 \u00D7 ${formatZAR(feeSchedule.fee_per_sqm)}/m\u00B2)`}
                  amount={buildingFee}
                  note={buildingFee === feeSchedule.min_fee ? `Minimum fee applied` : undefined}
                />
                {scrutinyFee > 0 && <FeeRow label="Plan scrutiny fee" amount={scrutinyFee} />}
                {inspectionFee > 0 && <FeeRow label="Building inspection fee" amount={inspectionFee} />}
                {sundryFee > 0 && <FeeRow label="Sundry / admin fee" amount={sundryFee} />}

                <div className="border-t border-neutral-200 pt-3 dark:border-neutral-700">
                  <FeeRow label="Subtotal" amount={totalFee} bold />
                  <FeeRow label="VAT (15%)" amount={vat} />
                </div>

                <div className="border-t border-neutral-200 pt-3 dark:border-neutral-700">
                  <FeeRow label="Estimated Total" amount={grandTotal} bold large />
                </div>
              </div>
            </CardContent>
          </Card>

          <p className="text-xs text-neutral-400 text-center">
            This is an estimate only. Actual fees may differ. Contact {municipalityName || 'your municipality'} for confirmed amounts.
            {feeSchedule.effective_date && ` Fee schedule effective from ${new Date(feeSchedule.effective_date).toLocaleDateString('en-ZA')}.`}
          </p>
        </div>
      )}
    </div>
  )
}

function FeeRow({
  label,
  amount,
  bold,
  large,
  note,
}: {
  label: string
  amount: number
  bold?: boolean
  large?: boolean
  note?: string
}) {
  const formatZAR = (a: number) =>
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(a)

  return (
    <div className="flex items-center justify-between">
      <div>
        <span className={`text-sm ${bold ? 'font-semibold' : 'text-neutral-500'} ${large ? 'text-base' : ''}`}>
          {label}
        </span>
        {note && <p className="text-[10px] text-neutral-400">{note}</p>}
      </div>
      <span className={`text-sm ${bold ? 'font-bold' : 'text-neutral-700 dark:text-neutral-300'} ${large ? 'text-lg text-blue-600' : ''}`}>
        {formatZAR(amount)}
      </span>
    </div>
  )
}
