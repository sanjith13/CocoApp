import { renderPrompt } from '@/lib/reports/prompt'
import { pickClimateClass, type ReportSnapshot } from '@/lib/reports/snapshot'

const full: ReportSnapshot = {
  farm: {
    name: 'Home farm',
    location: 'Pollachi, Tamil Nadu',
    acreage: 5,
    soilType: 'Red loam',
    trees: 400,
    varieties: [
      { name: 'Tall', trees: 300 },
      { name: 'Dwarf', trees: 100 },
    ],
  },
  harvest: {
    date: '2025-03-10',
    method: 'mudi',
    quantity: 120,
    unit: 'mudi',
    nuts: 24000,
    previous: { quantity: 110, unit: 'mudi' },
    changePct: 9.09,
    rate: null,
    revenue: null,
    estimatedRevenue: null,
  },
  weather: {
    avgTemp: 34,
    totalRain: 125,
    avgHumidity: 68,
    climateClass: 'normal',
    heatwave: false,
    heavyRain: false,
    daysWithData: 45,
    daysInPeriod: 45,
  },
  fertilizer: {
    used: [{ name: 'Urea', kg: 50 }],
    nKg: 45,
    pKg: 20,
    kKg: 50,
    nPerTreeKg: 0.1,
    pPerTreeKg: 0.05,
    kPerTreeKg: 0.1,
  },
  pests: [{ name: 'Rhinoceros beetle', severity: 'medium', date: '2025-02-20' }],
  market: { wholeNut: 28, dehusked: 90000, copra: 145 },
  period: { start: '2025-01-24', end: '2025-03-10' },
}

const EXPECTED = `I own a coconut farm.

Farm location:
Pollachi, Tamil Nadu

Trees: 400 (Tall 300, Dwarf 100)
Area: 5 acres

Current harvest (2025-03-10):
120 mudi (24000 nuts)

Previous harvest:
110 mudi

Harvest period: 2025-01-24 to 2025-03-10

Average temperature:
34.0°C

Rainfall:
125 mm

Average humidity:
68%

Fertilizer supplied:
N = 45.0 kg
P = 20.0 kg
K = 50.0 kg

Pest/disease incidents:
Rhinoceros beetle (medium)

Current market rates:
Whole coconut: ₹28/nut
Dehusked coconut: ₹90000/ton
Copra: ₹145/kg

Suggest:

1. How to improve yield.
2. Whether fertilizer application is adequate.
3. Possible reasons for yield changes.
4. Pest prevention recommendations.
5. Irrigation recommendations.`

describe('renderPrompt', () => {
  it('matches the template exactly for a full snapshot', () => {
    expect(renderPrompt(full)).toBe(EXPECTED)
  })

  it('omits previous harvest and market lines when null', () => {
    const s: ReportSnapshot = {
      ...full,
      harvest: { ...full.harvest, previous: null, changePct: null },
      market: { wholeNut: null, dehusked: null, copra: null },
    }
    const out = renderPrompt(s)
    expect(out).not.toContain('Previous harvest')
    expect(out).not.toContain('Current market rates')
    expect(out).not.toContain('Copra')
    expect(out).toContain('Current harvest (2025-03-10):')
  })

  it('omits only the market lines that are null', () => {
    const out = renderPrompt({ ...full, market: { wholeNut: 28, dehusked: null, copra: null } })
    expect(out).toContain('Whole coconut: ₹28/nut')
    expect(out).not.toContain('Dehusked')
    expect(out).not.toContain('Copra')
  })

  it('prints None reported when there are no pests', () => {
    expect(renderPrompt({ ...full, pests: [] })).toContain('Pest/disease incidents:\nNone reported')
  })

  it('shows tons without a nut count', () => {
    const out = renderPrompt({
      ...full,
      harvest: { ...full.harvest, method: 'ton', unit: 'ton', quantity: 2.5, nuts: undefined, previous: { quantity: 2, unit: 'ton' } },
    })
    expect(out).toContain('Current harvest (2025-03-10):\n2.5 ton\n')
    expect(out).toContain('Previous harvest:\n2 ton\n')
  })

  it('omits weather lines with no data', () => {
    const out = renderPrompt({ ...full, weather: { ...full.weather, avgTemp: null, totalRain: null, avgHumidity: null } })
    expect(out).not.toContain('Average temperature')
    expect(out).not.toContain('Rainfall')
    expect(out).not.toContain('humidity')
  })
})

describe('pickClimateClass', () => {
  const rows = [
    { month: '2025-01-01', climate_class: 'dry' },
    { month: '2025-02-01', climate_class: 'normal' },
    { month: '2025-03-01', climate_class: 'wet' },
  ]
  it('uses the harvest month when it is complete', () => {
    expect(pickClimateClass(rows, '2025-03-10', '2025-04-02')).toBe('wet')
  })
  it('falls back to the latest completed month when the harvest month is still open', () => {
    expect(pickClimateClass(rows, '2025-03-10', '2025-03-20')).toBe('normal')
  })
  it('returns null when nothing qualifies', () => {
    expect(pickClimateClass([], '2025-03-10', '2025-04-02')).toBeNull()
  })
})
