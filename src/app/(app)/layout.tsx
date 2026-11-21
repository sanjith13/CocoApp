import { Suspense } from 'react'
import { BottomTabs } from '@/components/nav/BottomTabs'
import { Sidebar } from '@/components/nav/Sidebar'
import { NavProgress } from '@/components/ui/nav-progress'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Suspense fallback={null}>
        <NavProgress />
      </Suspense>
      <Suspense fallback={null}>
        <Sidebar />
      </Suspense>
      <main className="flex-1 p-4 pb-20 md:pb-4">{children}</main>
      <Suspense fallback={null}>
        <BottomTabs />
      </Suspense>
    </div>
  )
}
