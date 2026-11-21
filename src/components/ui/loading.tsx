/** Loading indicator for Suspense fallbacks: a spinner ring around a coconut. */
export function Loading({ label = 'Loading…', className = '' }: { label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={`flex items-center justify-center gap-3 py-8 ${className}`}>
      <span className="relative inline-flex size-10 items-center justify-center">
        <span
          aria-hidden
          className="absolute inset-0 animate-spin rounded-full border-4 border-primary/20 border-t-primary motion-reduce:animate-none"
        />
        <span aria-hidden className="text-lg">
          🥥
        </span>
      </span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  )
}
