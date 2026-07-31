const BOARD_COLORS = [
  { badge: 'bg-blue-500/15 text-blue-400', dot: 'bg-blue-400', gradient: 'from-blue-500 to-indigo-600' },
  { badge: 'bg-green-500/15 text-green-400', dot: 'bg-green-400', gradient: 'from-green-500 to-emerald-600' },
  { badge: 'bg-purple-500/15 text-purple-400', dot: 'bg-purple-400', gradient: 'from-purple-500 to-fuchsia-600' },
  { badge: 'bg-amber-500/15 text-amber-400', dot: 'bg-amber-400', gradient: 'from-amber-500 to-orange-600' },
  { badge: 'bg-pink-500/15 text-pink-400', dot: 'bg-pink-400', gradient: 'from-pink-500 to-rose-600' },
  { badge: 'bg-cyan-500/15 text-cyan-400', dot: 'bg-cyan-400', gradient: 'from-cyan-500 to-blue-600' },
]

export function boardColor(key: string) {
  let hash = 0
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) % BOARD_COLORS.length
  return BOARD_COLORS[hash]
}
