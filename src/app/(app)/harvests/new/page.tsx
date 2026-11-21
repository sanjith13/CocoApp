import { T } from '@/lib/i18n/client'
import { Loading } from '@/components/ui/loading'
import { Suspense } from 'react'
import { HarvestFormLoader } from '@/components/harvests/HarvestFormLoader'

export default function Page() {
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">🥥 <T>Add harvest</T></h1>
      <Suspense fallback={<Loading />}>
        <HarvestFormLoader />
      </Suspense>
    </div>
  )
}
