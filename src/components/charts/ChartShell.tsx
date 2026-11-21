'use client'

import { useSyncExternalStore } from 'react'

/** Shows a pulsing placeholder until the chart has mounted in the browser (charts render client-side only). */
export function ChartShell({ children }: { children: React.ReactNode }) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
  if (!mounted) {
    return (
      <div role="status" aria-label="Loading chart" className="flex h-full w-full items-center justify-center rounded-lg bg-muted/60 motion-safe:animate-pulse">
        <span aria-hidden className="text-sm text-muted-foreground">
          📊 Loading chart…
        </span>
      </div>
    )
  }
  return <>{children}</>
}
