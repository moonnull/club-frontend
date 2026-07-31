const AVATAR_COLORS = [
  'bg-indigo-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
]

function avatarColor(name: string) {
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) % AVATAR_COLORS.length
  return AVATAR_COLORS[hash]
}

export default function InitialsAvatar({ name, size = 36 }: { name: string; size?: number }) {
  const initial = Array.from(name.trim())[0] ?? '?'
  return (
    <span
      className={`shrink-0 inline-flex items-center justify-center rounded-full text-white font-semibold ${avatarColor(name)}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </span>
  )
}
