export const sidebarLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/harvests/new', label: 'Add harvest' },
  { href: '/harvests', label: 'Harvests' },
  { href: '/farms', label: 'Farms' },
  { href: '/market', label: 'Market' },
  { href: '/fertilizer', label: 'Fertilizer' },
  { href: '/pests', label: 'Pests' },
  { href: '/weather', label: 'Weather' },
  { href: '/reports', label: 'Reports' },
] as const

export const moreLinks = sidebarLinks.filter((l) =>
  ['/harvests', '/market', '/fertilizer', '/pests', '/weather', '/reports'].includes(l.href),
)
