// 무채색 팔레트. 이름 해시로 명도만 다르게 배정해 사용자를 구분한다.
const AVATAR_COLORS = [
  'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900',
  'bg-gray-700 text-white dark:bg-gray-300 dark:text-gray-900',
  'bg-gray-500 text-white dark:bg-gray-400 dark:text-gray-900',
  'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900',
  'bg-gray-600 text-white dark:bg-gray-500 dark:text-white',
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
      className={`shrink-0 inline-flex items-center justify-center rounded-full font-semibold ${avatarColor(name)}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </span>
  )
}
