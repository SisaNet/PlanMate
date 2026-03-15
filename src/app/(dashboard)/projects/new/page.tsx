'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { WizardContainer } from '@/components/project-wizard/wizard-container'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

function ProjectWizardContent() {
  const searchParams = useSearchParams()
  const projectId = searchParams.get('id')

  // TODO: If projectId exists, fetch existing project for resume
  return <WizardContainer />
}

export default function NewProjectPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">New Project</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Set up your building plan compliance check in a few steps.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="mx-auto max-w-3xl space-y-6">
            <div className="flex justify-between">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-10 rounded-full" />
              ))}
            </div>
            <Card className="rounded-2xl">
              <CardContent className="space-y-4 p-8">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-40 w-full" />
              </CardContent>
            </Card>
          </div>
        }
      >
        <ProjectWizardContent />
      </Suspense>
    </div>
  )
}
