'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { signOut } from '@/app/(app)/actions'
import { moreLinks } from './items'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/dashboard', label: 'Dashboard', emoji: '🏠' },
  { href: '/harvests/new', label: 'Harvest +', emoji: '🥥' },
  { href: '/farms', label: 'Farms', emoji: '🌴' },
] as const

const tabClass = 'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium'

export function BottomTabs() {
  const pathname = usePathname()
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background md:hidden"
    >
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={cn(tabClass, pathname === t.href ? 'text-primary' : 'text-muted-foreground')}
        >
          <span aria-hidden className="text-lg leading-none">{t.emoji}</span>
          {t.label}
        </Link>
      ))}
      <Sheet>
        <SheetTrigger className={cn(tabClass, 'text-muted-foreground')}>
          <span aria-hidden className="text-lg leading-none">➕</span>
          More
        </SheetTrigger>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>More</SheetTitle>
          </SheetHeader>
          <ul className="flex flex-col px-4 pb-4">
            {moreLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="block py-3 text-base">
                  <span aria-hidden className="mr-2">{l.emoji}</span>
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <form action={signOut}>
                <button type="submit" className="block w-full py-3 text-left text-base">
                  Sign out
                </button>
              </form>
            </li>
          </ul>
        </SheetContent>
      </Sheet>
    </nav>
  )
}
