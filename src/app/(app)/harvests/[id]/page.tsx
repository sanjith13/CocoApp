import { Suspense } from 'react'
import { HarvestFormLoader } from '@/components/harvests/HarvestFormLoader'
import { DeleteHarvestButton } from '@/components/harvests/DeleteHarvestButton'

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <>
      <HarvestFormLoader harvestId={id} />
      <DeleteHarvestButton id={id} />
    </>
  )
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Edit harvest</h1>
      <Suspense fallback={<p className="text-muted-foreground">Loading...</p>}>
        <Content params={params} />
      </Suspense>
    </div>
  )
}
