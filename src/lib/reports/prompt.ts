import type { ReportSnapshot } from './snapshot'

const trim = (n: number) => String(Number(n.toFixed(3)))
const fixed = (n: number, dp: number) => n.toFixed(dp)

/** Renders the copy-ready AI prompt. Sections whose value is null are omitted. */
export function renderPrompt(s: ReportSnapshot): string {
  const blocks: string[] = ['I own a coconut farm.']

  if (s.farm.location) blocks.push(`Farm location:\n${s.farm.location}`)

  const trees: string[] = []
  if (s.farm.trees !== null) {
    const v = s.farm.varieties.map((x) => `${x.name} ${x.trees}`).join(', ')
    trees.push(`Trees: ${s.farm.trees}${v ? ` (${v})` : ''}`)
  }
  trees.push(`Area: ${trim(s.farm.acreage)} acres`)
  blocks.push(trees.join('\n'))

  const h = s.harvest
  const nuts = h.unit === 'mudi' && h.nuts !== undefined ? ` (${h.nuts} nuts)` : ''
  blocks.push(`Current harvest (${h.date}):\n${trim(h.quantity)} ${h.unit}${nuts}`)
  if (h.previous) blocks.push(`Previous harvest:\n${trim(h.previous.quantity)} ${h.previous.unit}`)

  blocks.push(`Harvest period: ${s.period.start} to ${s.period.end}`)

  const w = s.weather
  if (w.avgTemp !== null) blocks.push(`Average temperature:\n${fixed(w.avgTemp, 1)}°C`)
  if (w.totalRain !== null) blocks.push(`Rainfall:\n${fixed(w.totalRain, 0)} mm`)
  if (w.avgHumidity !== null) blocks.push(`Average humidity:\n${fixed(w.avgHumidity, 0)}%`)

  const f = s.fertilizer
  blocks.push(`Fertilizer supplied:\nN = ${fixed(f.nKg, 1)} kg\nP = ${fixed(f.pKg, 1)} kg\nK = ${fixed(f.kKg, 1)} kg`)

  const pests = s.pests.length ? s.pests.map((p) => `${p.name} (${p.severity})`).join('\n') : 'None reported'
  blocks.push(`Pest/disease incidents:\n${pests}`)

  const m = s.market
  const rates: string[] = []
  if (m.wholeNut !== null) rates.push(`Whole coconut: ₹${trim(m.wholeNut)}/nut`)
  if (m.dehusked !== null) rates.push(`Dehusked coconut: ₹${trim(m.dehusked)}/ton`)
  if (m.copra !== null) rates.push(`Copra: ₹${trim(m.copra)}/kg`)
  if (rates.length) blocks.push(`Current market rates:\n${rates.join('\n')}`)

  blocks.push(
    [
      'Suggest:',
      '',
      '1. How to improve yield.',
      '2. Whether fertilizer application is adequate.',
      '3. Possible reasons for yield changes.',
      '4. Pest prevention recommendations.',
      '5. Irrigation recommendations.',
    ].join('\n'),
  )
  return blocks.join('\n\n')
}
