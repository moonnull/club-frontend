// 사이트 전체가 무채색 팔레트이므로 게시판별 구분도 명도로만 표현한다.
type BoardStyle = { badge: string; dot: string; gradient: string }

const BADGE = 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300'

const BOARD_STYLES: BoardStyle[] = [
  { badge: BADGE, dot: 'bg-gray-900 dark:bg-white', gradient: 'from-gray-900 to-black' },
  { badge: BADGE, dot: 'bg-gray-500', gradient: 'from-gray-700 to-gray-900' },
  { badge: BADGE, dot: 'bg-gray-400', gradient: 'from-gray-600 to-gray-800' },
]

export function boardColor(key: string): BoardStyle {
  let hash = 0
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) % BOARD_STYLES.length
  return BOARD_STYLES[hash]
}
