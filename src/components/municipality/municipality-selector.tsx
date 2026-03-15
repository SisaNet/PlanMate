'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Fuse from 'fuse.js'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Search,
  MapPin,
  Building2,
  ChevronRight,
  Check,
  Globe,
  Phone,
  Mail,
  Clock,
  ExternalLink,
} from 'lucide-react'

interface Province {
  id: number
  name: string
  code: string
}

interface Municipality {
  id: number
  name: string
  municipality_type: string
  province_id: number
  aliases: string[]
  submission_method: string
  portal_url: string | null
  email: string | null
  phone: string | null
  office_hours: string | null
  climate_zone: number | null
}

interface MunicipalitySelectorProps {
  value: number | null
  onChange: (municipalityId: number | null, municipality?: Municipality) => void
  className?: string
}

export function MunicipalitySelector({
  value,
  onChange,
  className,
}: MunicipalitySelectorProps) {
  const [provinces, setProvinces] = useState<Province[]>([])
  const [municipalities, setMunicipalities] = useState<Municipality[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProvince, setSelectedProvince] = useState<number | null>(null)
  const [selectedMunicipality, setSelectedMunicipality] = useState<Municipality | null>(null)

  // Load data
  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      const [provResult, munResult] = await Promise.all([
        supabase.from('provinces').select('*').order('name'),
        supabase
          .from('municipalities')
          .select('id, name, municipality_type, province_id, aliases, submission_method, portal_url, email, phone, office_hours, climate_zone')
          .order('name'),
      ])
      setProvinces(provResult.data || [])
      setMunicipalities(munResult.data || [])
      setLoading(false)

      // If there's an existing value, find and select it
      if (value && munResult.data) {
        const existing = munResult.data.find((m) => m.id === value)
        if (existing) {
          setSelectedMunicipality(existing)
          setSelectedProvince(existing.province_id)
        }
      }
    }
    fetchData()
  }, [value])

  // Fuse.js fuzzy search
  const fuse = useMemo(() => {
    return new Fuse(municipalities, {
      keys: [
        { name: 'name', weight: 2 },
        { name: 'aliases', weight: 1.5 },
      ],
      threshold: 0.35,
      includeScore: true,
    })
  }, [municipalities])

  // Filtered municipalities
  const filteredMunicipalities = useMemo(() => {
    let results = municipalities

    if (searchQuery.trim()) {
      results = fuse.search(searchQuery).map((r) => r.item)
    } else if (selectedProvince) {
      results = municipalities.filter((m) => m.province_id === selectedProvince)
    }

    return results
  }, [municipalities, searchQuery, selectedProvince, fuse])

  const handleSelectMunicipality = useCallback(
    (municipality: Municipality) => {
      setSelectedMunicipality(municipality)
      setSearchQuery('')
      onChange(municipality.id, municipality)
    },
    [onChange]
  )

  const handleClear = useCallback(() => {
    setSelectedMunicipality(null)
    setSelectedProvince(null)
    setSearchQuery('')
    onChange(null)
  }, [onChange])

  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-9" />
          ))}
        </div>
      </div>
    )
  }

  // If a municipality is selected, show its details
  if (selectedMunicipality) {
    return (
      <div className={cn('space-y-4', className)}>
        <Label className="text-sm font-medium">Municipality</Label>
        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-neutral-900 dark:text-white">
                  {selectedMunicipality.name}
                </h4>
                <p className="text-sm text-neutral-500">
                  {provinces.find((p) => p.id === selectedMunicipality.province_id)?.name}
                  {' \u00b7 '}
                  {selectedMunicipality.municipality_type === 'metropolitan'
                    ? 'Metropolitan'
                    : 'Local'}{' '}
                  Municipality
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge
                    variant="secondary"
                    className="rounded-full text-xs"
                  >
                    <MapPin className="mr-1 h-3 w-3" />
                    {selectedMunicipality.submission_method === 'electronic'
                      ? 'Electronic'
                      : selectedMunicipality.submission_method === 'counter'
                      ? 'Counter'
                      : 'Electronic & Counter'}
                  </Badge>
                  {selectedMunicipality.climate_zone && (
                    <Badge
                      variant="secondary"
                      className="rounded-full text-xs"
                    >
                      Climate Zone {selectedMunicipality.climate_zone}
                    </Badge>
                  )}
                </div>
                {/* Contact details */}
                <div className="mt-3 space-y-1 text-xs text-neutral-500">
                  {selectedMunicipality.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3 w-3" />
                      {selectedMunicipality.email}
                    </div>
                  )}
                  {selectedMunicipality.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3" />
                      {selectedMunicipality.phone}
                    </div>
                  )}
                  {selectedMunicipality.office_hours && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      {selectedMunicipality.office_hours}
                    </div>
                  )}
                  {selectedMunicipality.portal_url && (
                    <div className="flex items-center gap-1.5">
                      <Globe className="h-3 w-3" />
                      <a
                        href={selectedMunicipality.portal_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Submission Portal
                        <ExternalLink className="ml-1 inline h-2.5 w-2.5" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={handleClear}
              className="rounded-lg px-2 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-100 dark:hover:bg-blue-900"
            >
              Change
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      <Label className="text-sm font-medium">Municipality</Label>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <Input
          placeholder="Search by city, town, or municipality name..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            if (e.target.value) setSelectedProvince(null)
          }}
          className="pl-10 rounded-xl"
        />
      </div>

      {/* Province filter chips */}
      {!searchQuery && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedProvince(null)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-medium transition',
              !selectedProvince
                ? 'bg-blue-600 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
            )}
          >
            All Provinces
          </button>
          {provinces.map((province) => (
            <button
              key={province.id}
              onClick={() => setSelectedProvince(province.id)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition',
                selectedProvince === province.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
              )}
            >
              {province.name}
            </button>
          ))}
        </div>
      )}

      {/* Municipality list */}
      <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-neutral-200 bg-white p-2 dark:border-neutral-800 dark:bg-neutral-900">
        {filteredMunicipalities.length === 0 ? (
          <div className="py-8 text-center text-sm text-neutral-400">
            No municipalities found. Try a different search term.
          </div>
        ) : (
          filteredMunicipalities.map((municipality) => (
            <button
              key={municipality.id}
              onClick={() => handleSelectMunicipality(municipality)}
              className={cn(
                'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-neutral-50 dark:hover:bg-neutral-800',
                value === municipality.id && 'bg-blue-50 dark:bg-blue-950'
              )}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
                  <Building2 className="h-4 w-4 text-neutral-500" />
                </div>
                <div>
                  <p className="font-medium text-neutral-900 dark:text-white">
                    {municipality.name}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {provinces.find((p) => p.id === municipality.province_id)?.name}
                    {municipality.municipality_type === 'metropolitan' && (
                      <span className="ml-1 text-blue-500">\u00b7 Metro</span>
                    )}
                  </p>
                </div>
              </div>
              {value === municipality.id ? (
                <Check className="h-4 w-4 text-blue-600" />
              ) : (
                <ChevronRight className="h-4 w-4 text-neutral-300" />
              )}
            </button>
          ))
        )}
      </div>

      {searchQuery && (
        <p className="text-xs text-neutral-400">
          {filteredMunicipalities.length} result{filteredMunicipalities.length !== 1 ? 's' : ''} found
        </p>
      )}
    </div>
  )
}
