import { Suspense } from 'react'
import { BottomTabs } from '@/components/nav/BottomTabs'
import { Sidebar } from '@/components/nav/Sidebar'
import { AdminLink } from '@/components/nav/AdminLink'
import { NavProgress } from '@/components/ui/nav-progress'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Suspense fallback={null}>
        <NavProgress />
      </Suspense>
      <Suspense fallback={null}>
        <Sidebar
          adminSlot={
            <Suspense fallback={null}>
              <AdminLink className="rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent" />
            </Suspense>
          }
        />
      </Suspense>
      <main className="flex-1 p-4 pb-20 md:pb-4">{children}</main>
      <Suspense fallback={null}>
        <BottomTabs
          adminSlot={
            <Suspense fallback={null}>
              <AdminLink className="block py-3 text-base" />
            </Suspense>
          }
        />
      </Suspense>
    </div>
  )
}
