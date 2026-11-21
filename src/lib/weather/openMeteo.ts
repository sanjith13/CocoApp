export type GeocodeResult = {
  name: string
  admin1?: string
  latitude: number
  longitude: number
}

export async function geocode(query: string, fetchFn: typeof fetch = fetch): Promise<GeocodeResult[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
  const res = await fetchFn(url)
  if (!res.ok) throw new Error(`Geocoding failed (${res.status})`)
  const body = (await res.json()) as { results?: Array<Record<string, unknown>> }
  return (body.results ?? []).map((r) => ({
    name: r.name as string,
    admin1: r.admin1 as string | undefined,
    latitude: r.latitude as number,
    longitude: r.longitude as number,
  }))
}
