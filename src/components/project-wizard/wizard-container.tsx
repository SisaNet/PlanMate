'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  MapPin,
  Home,
  Building2,
  AlertTriangle,
  ClipboardCheck,
} from 'lucide-react'
import { StepBasics } from './step-basics'
import { StepProperty } from './step-property'
import { StepBuilding } from './step-building'
import { StepConditions } from './step-conditions'
import { StepReview } from './step-review'

export interface WizardData {
  // Step 1: Basics
  name: string
  municipality_id: number | null
  municipality_name: string
  // Step 2: Property
  street_address: string
  erf_number: string
  zoning: string
  owner_name: string
  owner_contact: string
  // Step 3: Building
  building_type: string
  building_use_description: string
  gfa_sqm: number | null
  storeys: number | null
  // Step 4: Conditions
  is_coastal: boolean
  is_heritage: boolean
  is_addition: boolean
  is_sectional_title: boolean
  is_communal_land: boolean
  is_dolomite_zone: boolean
}

const initialData: WizardData = {
  name: '',
  municipality_id: null,
  municipality_name: '',
  street_address: '',
  erf_number: '',
  zoning: '',
  owner_name: '',
  owner_contact: '',
  building_type: '',
  building_use_description: '',
  gfa_sqm: null,
  storeys: null,
  is_coastal: false,
  is_heritage: false,
  is_addition: false,
  is_sectional_title: false,
  is_communal_land: false,
  is_dolomite_zone: false,
}

const steps = [
  { id: 1, name: 'Basics', icon: MapPin, description: 'Project name & municipality' },
  { id: 2, name: 'Property', icon: Home, description: 'Address & ownership' },
  { id: 3, name: 'Building', icon: Building2, description: 'Type, size & use' },
  { id: 4, name: 'Conditions', icon: AlertTriangle, description: 'Special conditions' },
  { id: 5, name: 'Review', icon: ClipboardCheck, description: 'Confirm & create' },
]

interface WizardContainerProps {
  existingProject?: {
    id: string
    wizard_step: number
    wizard_data: Record<string, unknown>
  }
}

export function WizardContainer({ existingProject }: WizardContainerProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(existingProject?.wizard_step || 1)
  const [data, setData] = useState<WizardData>(() => {
    if (existingProject?.wizard_data) {
      return { ...initialData, ...existingProject.wizard_data } as WizardData
    }
    return initialData
  })
  const [saving, setSaving] = useState(false)

  const updateData = useCallback((updates: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...updates }))
  }, [])

  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 1:
        return data.name.trim() !== '' && data.municipality_id !== null
      case 2:
        return data.street_address.trim() !== ''
      case 3:
        return data.building_type !== ''
      case 4:
        return true
      case 5:
        return true
      default:
        return false
    }
  }, [currentStep, data])

  const handleNext = useCallback(() => {
    if (currentStep < 5) {
      setCurrentStep((prev) => prev + 1)
    }
  }, [currentStep])

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
    }
  }, [currentStep])

  const ensureProfile = useCallback(async (supabase: ReturnType<typeof createClient>, userId: string, email: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (!profile) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({ id: userId, full_name: '', email: email || '' })
      if (profileError && !profileError.message.includes('duplicate')) {
        throw new Error('Failed to create user profile: ' + profileError.message)
      }
    }
  }, [])

  const handleSaveDraft = useCallback(async () => {
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated — please sign in again')

      await ensureProfile(supabase, user.id, user.email || '')

      if (existingProject) {
        const { error } = await supabase
          .from('projects')
          .update({
            wizard_step: currentStep,
            wizard_data: data as unknown as Record<string, unknown>,
            name: data.name || 'Untitled Project',
            municipality_id: data.municipality_id,
            status: 'draft',
          })
          .eq('id', existingProject.id)
        if (error) throw error
        toast.success('Draft saved')
      } else {
        const { data: project, error } = await supabase
          .from('projects')
          .insert({
            user_id: user.id,
            name: data.name || 'Untitled Project',
            municipality_id: data.municipality_id,
            status: 'draft',
            wizard_step: currentStep,
            wizard_data: data as unknown as Record<string, unknown>,
          })
          .select()
          .single()

        if (error) throw error
        toast.success('Draft saved')
        router.push(`/projects/new?id=${project.id}`)
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save draft'
      toast.error(message)
      console.error('Save draft error:', error)
    } finally {
      setSaving(false)
    }
  }, [currentStep, data, existingProject, router, ensureProfile])

  const handleCreate = useCallback(async () => {
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated — please sign in again')

      await ensureProfile(supabase, user.id, user.email || '')

      const projectPayload = {
        user_id: user.id,
        name: data.name,
        municipality_id: data.municipality_id,
        street_address: data.street_address || null,
        erf_number: data.erf_number || null,
        zoning: data.zoning || null,
        owner_name: data.owner_name || null,
        owner_contact: data.owner_contact || null,
        building_type: data.building_type || null,
        building_use_description: data.building_use_description || null,
        gfa_sqm: data.gfa_sqm,
        storeys: data.storeys,
        is_coastal: data.is_coastal,
        is_heritage: data.is_heritage,
        is_addition: data.is_addition,
        is_sectional_title: data.is_sectional_title,
        is_communal_land: data.is_communal_land,
        is_dolomite_zone: data.is_dolomite_zone,
        status: 'in_progress' as const,
        wizard_step: 5,
        wizard_data: data as unknown as Record<string, unknown>,
      }

      let projectId: string

      if (existingProject) {
        const { error } = await supabase
          .from('projects')
          .update(projectPayload)
          .eq('id', existingProject.id)
        if (error) throw error
        projectId = existingProject.id
      } else {
        const { data: project, error } = await supabase
          .from('projects')
          .insert(projectPayload)
          .select()
          .single()
        if (error) throw error
        projectId = project.id
      }

      toast.success('Project created! Generating compliance checklist...')
      router.push(`/projects/${projectId}`)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create project'
      toast.error(message)
      console.error('Create project error:', error)
    } finally {
      setSaving(false)
    }
  }, [data, existingProject, router, ensureProfile])

  return (
    <div className="mx-auto max-w-3xl">
      {/* Step indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isComplete = currentStep > step.id
            const isCurrent = currentStep === step.id
            const StepIcon = step.icon

            return (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all',
                      isComplete
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : isCurrent
                        ? 'border-blue-600 bg-white text-blue-600 dark:bg-neutral-950'
                        : 'border-neutral-200 bg-white text-neutral-400 dark:border-neutral-700 dark:bg-neutral-900'
                    )}
                  >
                    {isComplete ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <StepIcon className="h-5 w-5" />
                    )}
                  </div>
                  <div className="mt-2 hidden text-center sm:block">
                    <p
                      className={cn(
                        'text-xs font-medium',
                        isCurrent
                          ? 'text-blue-600'
                          : isComplete
                          ? 'text-neutral-900 dark:text-white'
                          : 'text-neutral-400'
                      )}
                    >
                      {step.name}
                    </p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'mx-2 h-0.5 w-8 sm:w-12 md:w-16 lg:w-20',
                      currentStep > step.id
                        ? 'bg-blue-600'
                        : 'bg-neutral-200 dark:bg-neutral-700'
                    )}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Step content */}
      <Card className="rounded-2xl border-neutral-200 shadow-sm dark:border-neutral-800">
        <CardContent className="p-6 md:p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold tracking-tight dark:text-white">
              {steps[currentStep - 1].name}
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              {steps[currentStep - 1].description}
            </p>
          </div>

          {currentStep === 1 && <StepBasics data={data} onChange={updateData} />}
          {currentStep === 2 && <StepProperty data={data} onChange={updateData} />}
          {currentStep === 3 && <StepBuilding data={data} onChange={updateData} />}
          {currentStep === 4 && <StepConditions data={data} onChange={updateData} />}
          {currentStep === 5 && <StepReview data={data} onEdit={setCurrentStep} />}
        </CardContent>
      </Card>

      {/* Navigation buttons */}
      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {currentStep > 1 && (
            <Button
              variant="outline"
              onClick={handleBack}
              className="rounded-full gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={handleSaveDraft}
            disabled={saving || !data.name.trim()}
            className="rounded-full text-neutral-500"
          >
            {saving ? 'Saving...' : 'Save draft'}
          </Button>

          {currentStep < 5 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="rounded-full gap-2"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleCreate}
              disabled={saving}
              className="rounded-full gap-2"
            >
              {saving ? 'Creating...' : 'Create Project'}
              <Check className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
