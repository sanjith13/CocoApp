import { BottomTabs } from '@/components/nav/BottomTabs'
import { Sidebar } from '@/components/nav/Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 pb-20 md:pb-4">{children}</main>
      <BottomTabs />
    </div>
  )
}
