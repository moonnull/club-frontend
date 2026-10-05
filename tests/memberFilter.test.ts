/**
 * 관리자 회원 목록의 찾기 규칙.
 *
 * "플랜 미배정 / 트랙 미배정" 하나뿐이던 필터를 축별로 나눴다. 두 축을 겹쳐
 * 거를 때("비기너인데 트랙 미배정") 맞게 나오는지가 핵심이다.
 */
import { describe, expect, it } from 'vitest'
import { EMPTY_QUERY, filterMembers, isFiltered, parseAxis } from '@/lib/memberFilter'
import type { Plan, Track, User } from '@/lib/types'

const beginner: Plan = { id: 1, key: 'BEGINNER', name: '비기너', order: 1 }
const middle: Plan = { id: 2, key: 'MIDDLE', name: '미들', order: 2 }
const rev: Track = { id: 10, key: 'REV', name: '리버싱', order: 1 }
const web: Track = { id: 11, key: 'WEB', name: '웹해킹', order: 2 }

function user(name: string, plan: Plan | null, tracks: Track[], extra: Partial<User> = {}): User {
  return {
    id: name.length * 100 + name.charCodeAt(0),
    name,
    student_id: `s-${name}`,
    email: `${name}@x.com`,
    generation: 9,
    role: 'MEMBER',
    is_active: true,
    created_at: '2026-09-01T00:00:00',
    has_security_question: true,
    plan,
    tracks,
    caution_count: 0,
    warning_count: 0,
    ...extra,
  }
}

const people = [
  user('가영', beginner, [rev]),
  user('나래', beginner, []),
  user('다솜', middle, [rev, web]),
  user('라온', null, [web]),
  user('마루', null, []),
]

const names = (list: User[]) => list.map((u) => u.name)
const q = (over: Partial<typeof EMPTY_QUERY>) => ({ ...EMPTY_QUERY, ...over })

describe('플랜으로 거르기', () => {
  it('특정 플랜', () => {
    expect(names(filterMembers(people, q({ plan: beginner.id })))).toEqual(['가영', '나래'])
  })

  it('플랜 미배정', () => {
    expect(names(filterMembers(people, q({ plan: 'NONE' })))).toEqual(['라온', '마루'])
  })
})

describe('트랙으로 거르기', () => {
  it('그 트랙을 "포함하는" 사람 — 여러 트랙을 듣는 사람도 나온다', () => {
    expect(names(filterMembers(people, q({ track: web.id })))).toEqual(['다솜', '라온'])
  })

  it('트랙 미배정', () => {
    expect(names(filterMembers(people, q({ track: 'NONE' })))).toEqual(['나래', '마루'])
  })

  it('트랙 정보가 없는 예전 캐시도 미배정으로 본다', () => {
    const legacy = { ...user('바다', null, []), tracks: undefined } as unknown as User
    expect(names(filterMembers([legacy], q({ track: 'NONE' })))).toEqual(['바다'])
  })
})

describe('두 축을 겹쳐 거르기', () => {
  it('비기너인데 트랙 미배정', () => {
    expect(names(filterMembers(people, q({ plan: beginner.id, track: 'NONE' })))).toEqual(['나래'])
  })

  it('플랜·트랙 모두 미배정', () => {
    expect(names(filterMembers(people, q({ plan: 'NONE', track: 'NONE' })))).toEqual(['마루'])
  })

  it('검색까지 겹친다', () => {
    expect(names(filterMembers(people, q({ track: rev.id, search: '다' })))).toEqual(['다솜'])
  })
})

describe('정렬', () => {
  it('이름은 가나다순', () => {
    const shuffled = [people[3], people[0], people[4], people[1]]
    expect(names(filterMembers(shuffled, EMPTY_QUERY))).toEqual(['가영', '나래', '라온', '마루'])
  })

  it('원본 배열을 건드리지 않는다', () => {
    const original = [people[2], people[0]]
    filterMembers(original, EMPTY_QUERY)
    expect(names(original)).toEqual(['다솜', '가영'])
  })
})

describe('parseAxis', () => {
  it.each([
    ['ALL', 'ALL'],
    ['NONE', 'NONE'],
    ['3', 3],
    ['abc', 'ALL'],
    ['-1', 'ALL'],
    ['1.5', 'ALL'],
  ] as const)('%s → %s', (input, expected) => {
    expect(parseAxis(input)).toBe(expected)
  })
})

describe('isFiltered', () => {
  it('정렬만 바꾼 건 필터가 아니다', () => {
    expect(isFiltered(q({ sort: 'created' }))).toBe(false)
    expect(isFiltered(q({ search: '   ' }))).toBe(false)
    expect(isFiltered(q({ track: 'NONE' }))).toBe(true)
  })
})
