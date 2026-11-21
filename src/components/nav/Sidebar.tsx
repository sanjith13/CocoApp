'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/app/(app)/actions'
import { sidebarLinks } from './items'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/ui/logo'

export function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 text-sidebar-foreground md:flex">
      <div className="mb-6"><Logo /></div>
      <nav aria-label="Sidebar" className="flex flex-1 flex-col gap-1">
        {sidebarLinks.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              'rounded-lg px-3 py-2 text-sm transition-colors',
              pathname === l.href
                ? 'bg-sidebar-primary font-semibold text-sidebar-primary-foreground'
                : 'text-sidebar-foreground/80 hover:bg-sidebar-accent',
            )}
          >
            <span aria-hidden className="mr-2">{l.emoji}</span>
            {l.label}
          </Link>
        ))}
      </nav>
      <form action={signOut}>
        <button type="submit" className="w-full rounded-lg px-3 py-2 text-left text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent">
          <span aria-hidden className="mr-2">👋</span>
          Sign out
        </button>
      </form>
    </aside>
  )
}
