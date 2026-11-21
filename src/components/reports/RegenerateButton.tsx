'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { regenerateReport } from '@/app/(app)/reports/actions'

export function RegenerateButton({ harvestId, label }: { harvestId: string; label: string }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onClick() {
    setError(null)
    start(async () => {
      const res = await regenerateReport(harvestId)
      if (!res.ok) setError(res.error)
    })
  }

  return (
    <div className="no-print space-y-1">
      <Button type="button" variant="outline" disabled={pending} onClick={onClick} className="h-11">
        {pending ? 'Working...' : label}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
