'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { signOut } from '@/app/(app)/actions'
import { moreLinks } from './items'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/harvests/new', label: 'Harvest +' },
  { href: '/farms', label: 'Farms' },
] as const

const tabClass = 'flex flex-1 items-center justify-center py-3 text-xs font-medium'

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
          {t.label}
        </Link>
      ))}
      <Sheet>
        <SheetTrigger className={cn(tabClass, 'text-muted-foreground')}>More</SheetTrigger>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>More</SheetTitle>
          </SheetHeader>
          <ul className="flex flex-col px-4 pb-4">
            {moreLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="block py-3 text-base">
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
