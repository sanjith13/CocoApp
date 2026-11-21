'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/app/(app)/actions'
import { sidebarLinks } from './items'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r p-4 md:flex">
      <div className="mb-6 text-lg font-semibold">CocoApp</div>
      <nav aria-label="Sidebar" className="flex flex-1 flex-col gap-1">
        {sidebarLinks.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              'rounded-md px-3 py-2 text-sm',
              pathname === l.href ? 'bg-muted font-medium' : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <form action={signOut}>
        <button type="submit" className="w-full rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted">
          Sign out
        </button>
      </form>
    </aside>
  )
}
