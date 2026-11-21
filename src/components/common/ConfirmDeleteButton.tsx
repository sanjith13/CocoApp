'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'

type Result = { ok: true } | { ok: false; error: string }

/** Two-tap delete (Delete, then Confirm) for a row; avoids window.confirm. */
export function ConfirmDeleteButton({
  id,
  action,
  label = 'Delete',
}: {
  id: string
  action: (id: string) => Promise<Result>
  label?: string
}) {
  const [armed, setArmed] = useState(false)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function confirm() {
    setError(null)
    start(async () => {
      const res = await action(id)
      if (!res.ok) setError(res.error)
      setArmed(false)
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {armed ? (
        <>
          <Button type="button" variant="outline" disabled={pending} onClick={confirm} className="h-10 text-destructive">
            {pending ? 'Deleting...' : 'Confirm'}
          </Button>
          <Button type="button" variant="ghost" disabled={pending} onClick={() => setArmed(false)}>
            Cancel
          </Button>
        </>
      ) : (
        <Button type="button" variant="ghost" onClick={() => setArmed(true)} className="h-10 text-destructive">
          {label}
        </Button>
      )}
      {error && <span className="text-sm text-destructive">{error}</span>}
    </div>
  )
}
