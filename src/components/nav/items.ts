export const sidebarLinks = [
  { href: '/dashboard', label: 'Dashboard', emoji: '🏠' },
  { href: '/harvests/new', label: 'Add harvest', emoji: '🥥' },
  { href: '/harvests', label: 'Harvests', emoji: '🧺' },
  { href: '/farms', label: 'Farms', emoji: '🌴' },
  { href: '/market', label: 'Market', emoji: '💰' },
  { href: '/expenses', label: 'Expenses', emoji: '🧾' },
  { href: '/fertilizer', label: 'Fertilizer', emoji: '🌱' },
  { href: '/pests', label: 'Pests', emoji: '🐛' },
  { href: '/weather', label: 'Weather', emoji: '🌦️' },
  { href: '/reports', label: 'Reports', emoji: '📄' },
] as const

export const moreLinks = sidebarLinks.filter((l) =>
  ['/harvests', '/market', '/expenses', '/fertilizer', '/pests', '/weather', '/reports'].includes(l.href),
)
