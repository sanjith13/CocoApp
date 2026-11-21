import { T } from '@/lib/i18n/client'
import { Loading } from '@/components/ui/loading'
import { Suspense } from 'react'
import Link from 'next/link'
import { HarvestFormLoader } from '@/components/harvests/HarvestFormLoader'
import { DeleteHarvestButton } from '@/components/harvests/DeleteHarvestButton'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ notice?: string | string[] }>
}

async function Content({ params, searchParams }: Props) {
  const { id } = await params
  const { notice } = await searchParams
  const text = Array.isArray(notice) ? notice[0] : notice
  return (
    <>
      {text && <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">{text}</p>}
      <Link href={`/reports/${id}`} className="block text-sm underline">
        View harvest report
      </Link>
      <HarvestFormLoader harvestId={id} />
      <DeleteHarvestButton id={id} />
    </>
  )
}

export default function Page({ params, searchParams }: Props) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">🥥 <T>Edit harvest</T></h1>
      <Suspense fallback={<Loading />}>
        <Content params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
