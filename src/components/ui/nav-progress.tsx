'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * Thin progress bar at the top of the screen while a link navigation is loading.
 * Starts on an internal link click, ends when the path or query string changes.
 */
export function NavProgress() {
  const pathname = usePathname()
  const search = useSearchParams().toString()
  const here = `${pathname}?${search}`
  // The location a click started from; loading lasts until the location differs from it.
  const [from, setFrom] = useState<string | null>(null)
  const loading = from !== null && from === here

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest?.('a')
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return
      const url = new URL(a.href, window.location.href)
      if (url.origin !== window.location.origin) return
      if (url.pathname === window.location.pathname && url.search === window.location.search) return
      setFrom(`${window.location.pathname}?${window.location.search.replace(/^\?/, '')}`)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  if (!loading) return null
  return (
    <div role="progressbar" aria-label="Loading page" className="no-print fixed inset-x-0 top-0 z-50 h-1 overflow-hidden bg-primary/15">
      <div className="h-full w-1/3 animate-[navbar_1.1s_ease-in-out_infinite] rounded-full bg-primary motion-reduce:animate-none" />
    </div>
  )
}
