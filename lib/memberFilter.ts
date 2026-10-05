import type { User } from './types'

/**
 * 관리자 회원 목록의 찾기 규칙.
 *
 * 화면 안에 섞여 있으면 "트랙 미배정 + 비기너" 같은 조합이 맞게 걸러지는지
 * 확인할 방법이 화면을 직접 눌러보는 것뿐이라, 순수 함수로 떼어 테스트한다.
 */

/** 플랜·트랙 필터 값. 'ALL' = 제한 없음, 'NONE' = 미배정, 그 외 = 해당 id. */
export type AxisFilter = 'ALL' | 'NONE' | number

export type SortKey = 'name' | 'generation' | 'created'

export const SORT_LABEL: Record<SortKey, string> = {
  name: '이름순',
  generation: '기수순',
  created: '가입순',
}

export interface MemberQuery {
  search: string
  plan: AxisFilter
  track: AxisFilter
  sort: SortKey
}

export const EMPTY_QUERY: MemberQuery = { search: '', plan: 'ALL', track: 'ALL', sort: 'name' }

/** <select>의 문자열 값을 필터 값으로. 숫자가 아닌 엉뚱한 값은 '제한 없음'으로 본다. */
export function parseAxis(value: string): AxisFilter {
  if (value === 'NONE') return 'NONE'
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : 'ALL'
}

function matchesSearch(user: User, search: string): boolean {
  const q = search.trim().toLowerCase()
  if (!q) return true
  return (
    user.name.toLowerCase().includes(q) ||
    user.student_id.toLowerCase().includes(q) ||
    user.email.toLowerCase().includes(q)
  )
}

function matchesPlan(user: User, plan: AxisFilter): boolean {
  if (plan === 'ALL') return true
  if (plan === 'NONE') return !user.plan
  return user.plan?.id === plan
}

function matchesTrack(user: User, track: AxisFilter): boolean {
  // 예전 세션의 캐시에는 tracks가 없을 수 있다.
  const tracks = user.tracks ?? []
  if (track === 'ALL') return true
  if (track === 'NONE') return tracks.length === 0
  // 한 사람이 여러 트랙을 들을 수 있으므로 "그 트랙을 포함하는" 사람이다.
  return tracks.some((t) => t.id === track)
}

function compare(sort: SortKey) {
  return (a: User, b: User): number => {
    // 한글 이름은 코드포인트 순서가 가나다순과 다르므로 로케일 비교를 쓴다.
    if (sort === 'name') return a.name.localeCompare(b.name, 'ko')
    if (sort === 'generation') return b.generation - a.generation || a.name.localeCompare(b.name, 'ko')
    return b.created_at.localeCompare(a.created_at)
  }
}

/** 검색 → 플랜 → 트랙 → 정렬. 원본 배열은 건드리지 않는다. */
export function filterMembers(users: User[], query: MemberQuery): User[] {
  return users
    .filter(
      (u) =>
        matchesSearch(u, query.search) &&
        matchesPlan(u, query.plan) &&
        matchesTrack(u, query.track)
    )
    .sort(compare(query.sort))
}

/** 필터가 하나라도 걸려 있는가. "필터 초기화" 버튼을 보일지 정한다. */
export function isFiltered(query: MemberQuery): boolean {
  return query.search.trim() !== '' || query.plan !== 'ALL' || query.track !== 'ALL'
}
