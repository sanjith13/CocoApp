'use client'

import { useActionState, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { geocode, type GeocodeResult } from '@/lib/weather/openMeteo'
import type { ActionResult } from '@/app/(app)/farms/actions'

type Farm = {
  name: string
  location_text: string | null
  latitude: number
  longitude: number
  acreage: number
  soil_type: string | null
}

type Props = {
  action: (prev: ActionResult | null, form: FormData) => Promise<ActionResult>
  farm?: Farm
  submitLabel: string
}

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.length ? <p className="text-sm text-destructive">{errors[0]}</p> : null
}

export function FarmForm({ action, farm, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, null)
  const fe = state && !state.ok ? (state.fieldErrors ?? {}) : {}
  const [lat, setLat] = useState(farm ? String(farm.latitude) : '')
  const [lon, setLon] = useState(farm ? String(farm.longitude) : '')
  const [place, setPlace] = useState(farm?.location_text ?? '')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeocodeResult[]>([])
  const [geoMsg, setGeoMsg] = useState<string | null>(null)

  async function search() {
    if (!query.trim()) return
    setGeoMsg(null)
    try {
      const r = await geocode(query.trim())
      setResults(r)
      if (r.length === 0) setGeoMsg('No places found.')
    } catch {
      setGeoMsg('Location search failed. Enter coordinates manually.')
    }
  }

  function pick(r: GeocodeResult) {
    setLat(r.latitude.toFixed(5))
    setLon(r.longitude.toFixed(5))
    setPlace([r.name, r.admin1].filter(Boolean).join(', '))
    setResults([])
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setGeoMsg('Geolocation is not available on this device.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLat(p.coords.latitude.toFixed(5))
        setLon(p.coords.longitude.toFixed(5))
        setGeoMsg(null)
      },
      () => setGeoMsg('Could not get your location.'),
    )
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="name">Farm name</Label>
        <Input id="name" name="name" defaultValue={farm?.name} required maxLength={80} className="h-11" />
        <FieldError errors={fe.name} />
      </div>

      <div className="space-y-2 rounded-lg border p-3">
        <Label htmlFor="q">Find location</Label>
        <div className="flex gap-2">
          <Input
            id="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void search()
              }
            }}
            placeholder="Village or town"
            className="h-11"
          />
          <Button type="button" variant="secondary" className="h-11" onClick={search}>
            Search
          </Button>
        </div>
        {results.length > 0 && (
          <ul className="divide-y rounded-md border">
            {results.map((r, i) => (
              <li key={`${r.latitude},${r.longitude},${i}`}>
                <button type="button" className="w-full p-3 text-left text-sm" onClick={() => pick(r)}>
                  {r.name}
                  {r.admin1 ? `, ${r.admin1}` : ''}
                </button>
              </li>
            ))}
          </ul>
        )}
        <Button type="button" variant="outline" className="h-11 w-full" onClick={useMyLocation}>
          Use my location
        </Button>
        {geoMsg && <p className="text-sm text-muted-foreground">{geoMsg}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="location_text">Location name</Label>
        <Input
          id="location_text"
          name="location_text"
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          className="h-11"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="latitude">Latitude</Label>
          <Input id="latitude" name="latitude" type="number" step="any" inputMode="decimal" required value={lat} onChange={(e) => setLat(e.target.value)} className="h-11" />
          <FieldError errors={fe.latitude} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="longitude">Longitude</Label>
          <Input id="longitude" name="longitude" type="number" step="any" inputMode="decimal" required value={lon} onChange={(e) => setLon(e.target.value)} className="h-11" />
          <FieldError errors={fe.longitude} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="acreage">Acreage</Label>
          <Input id="acreage" name="acreage" type="number" step="any" min={0} inputMode="decimal" required defaultValue={farm?.acreage} className="h-11" />
          <FieldError errors={fe.acreage} />
        </div>
        {!farm && (
          <div className="space-y-1">
            <Label htmlFor="tree_count">Trees</Label>
            <Input id="tree_count" name="tree_count" type="number" min={0} step={1} inputMode="numeric" required className="h-11" />
            <FieldError errors={fe.tree_count} />
          </div>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="soil_type">Soil type (optional)</Label>
        <Input id="soil_type" name="soil_type" defaultValue={farm?.soil_type ?? ''} className="h-11" />
      </div>

      {state && !state.ok && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-700">Saved.</p>}
      <Button type="submit" disabled={pending} className="h-12 w-full">
        {pending ? 'Saving...' : submitLabel}
      </Button>
    </form>
  )
}
