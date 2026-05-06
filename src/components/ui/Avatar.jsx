const PALETTE = ['#6366f1', '#8b5cf6', '#3b82f6', '#14b8a6', '#f43f5e', '#f97316']

function deterministicColor(str) {
  if (!str) return PALETTE[0]
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

export default function Avatar({ profile, email, size = 'md', className = '' }) {
  const sizes = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-14 h-14 text-xl',
    xl: 'w-20 h-20 text-2xl',
  }

  const url = profile?.avatar_url

  // Uploaded image
  if (url && !url.startsWith('color:')) {
    return (
      <img
        src={url}
        alt=""
        className={`${sizes[size]} rounded-full object-cover flex-shrink-0 ${className}`}
      />
    )
  }

  // First letter of first name, fallback to email initial
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || ''
  const fallbackEmail = email || profile?.email || ''
  const initial = (firstName[0] || fallbackEmail[0] || '?').toUpperCase()

  // Color: explicit pick overrides deterministic
  const bg = url?.startsWith('color:')
    ? url.slice(6)
    : deterministicColor(firstName || fallbackEmail)

  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 select-none ${className}`}
      style={{ backgroundColor: bg }}
    >
      {initial}
    </div>
  )
}
