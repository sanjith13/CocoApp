import { T } from '@/lib/i18n/client'
import { FarmForm } from '@/components/farms/FarmForm'
import { createFarm } from '../actions'

export default function Page() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">🌴 <T>New farm</T></h1>
      <FarmForm action={createFarm} submitLabel="Create farm" />
    </div>
  )
}
