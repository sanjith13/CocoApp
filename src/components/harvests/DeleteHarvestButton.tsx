'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { deleteHarvest } from '@/app/(app)/harvests/actions'

export function DeleteHarvestButton({ id }: { id: string }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onClick() {
    if (!window.confirm('Delete this harvest? This cannot be undone.')) return
    start(async () => {
      const res = await deleteHarvest(id)
      if (res && !res.ok) setError(res.error)
    })
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" disabled={pending} onClick={onClick} className="h-11 w-full text-destructive">
        {pending ? 'Deleting...' : 'Delete harvest'}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
