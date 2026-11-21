import { Card } from '@/components/ui/card'

export function KpiCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: string
}) {
  return (
    <Card className="gap-1 p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold leading-tight">{value}</div>
      {sub ? <div className="text-xs text-muted-foreground">{sub}</div> : null}
    </Card>
  )
}
