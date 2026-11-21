import { Loading } from '@/components/ui/loading'
import { Suspense } from 'react'
import { HarvestFormLoader } from '@/components/harvests/HarvestFormLoader'

export default function Page() {
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">🥥 Add harvest</h1>
      <Suspense fallback={<Loading />}>
        <HarvestFormLoader />
      </Suspense>
    </div>
  )
}
