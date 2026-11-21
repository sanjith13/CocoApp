/** CocoApp mark: a coconut under two palm fronds on a leaf-green tile. */
export function LogoMark({ className = 'size-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="CocoApp">
      <rect width="64" height="64" rx="16" fill="#2f7d4a" />
      <path d="M32 30C24 14 12 14 7 20c9-1 17 3 25 10Z" fill="#8fd18f" />
      <path d="M32 30c8-16 20-16 25-10-9-1-17 3-25 10Z" fill="#b6e3a5" />
      <path d="M32 30c-2-9 0-15 3-19-5 3-8 10-3 19Z" fill="#6fbf7a" />
      <circle cx="32" cy="42" r="14" fill="#7a4a24" />
      <circle cx="32" cy="42" r="14" fill="none" stroke="#5a3318" strokeWidth="2" />
      <circle cx="27" cy="39" r="2" fill="#3b200d" />
      <circle cx="35" cy="39" r="2" fill="#3b200d" />
      <circle cx="31" cy="46" r="2" fill="#3b200d" />
      <path d="M24 36c2-3 5-4 8-4" stroke="#a9753f" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2 ${className ?? ''}`}>
      <LogoMark />
      <span className="font-heading text-xl font-semibold tracking-tight">CocoApp</span>
    </span>
  )
}
