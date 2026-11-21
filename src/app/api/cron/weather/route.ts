import { ingestRecentWeather } from '@/lib/weather/ingest'

// Backfill retries can be slow; 300s is the Vercel Hobby maximum with Fluid compute.
export const maxDuration = 300

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  return Response.json(await ingestRecentWeather())
}
