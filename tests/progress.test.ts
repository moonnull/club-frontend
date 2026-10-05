/** 과제 제출 현황 화면의 규칙 — 단계 판정, 과제 필터, 대상자 탭, 독촉 문구. */
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PROGRESS_QUERY,
  filterProgress,
  membersInTab,
  phaseOf,
  reminderMessage,
} from '@/lib/progress'
import type { AssigneeStatus, AssignmentProgress } from '@/lib/types'

const NOW = new Date('2026-10-05T03:00:00Z')

function asg(id: number, start: string, end: string, extra: Partial<AssignmentProgress> = {}): AssignmentProgress {
  return {
    id, title: `과제${id}`, start_at: start, end_at: end, track: null, plan: null,
    assignees: 3, final: 1, draft: 1, missing: 2, ...extra,
  }
}

const upcoming = asg(1, '2026-10-10T00:00:00', '2026-10-17T00:00:00')
const open = asg(2, '2026-10-01T00:00:00', '2026-10-08T09:00:00', {
  track: { id: 10, key: 'REV', name: '리버싱', order: 1 },
})
const closed = asg(3, '2026-09-01T00:00:00', '2026-09-08T00:00:00', {
  plan: { id: 1, key: 'BEGINNER', name: '비기너', order: 1 },
})
const all = [upcoming, open, closed]
const ids = (list: AssignmentProgress[]) => list.map((a) => a.id)

describe('phaseOf', () => {
  it('시작 전·진행 중·마감을 가른다', () => {
    expect(phaseOf(upcoming, NOW)).toBe('UPCOMING')
    expect(phaseOf(open, NOW)).toBe('OPEN')
    expect(phaseOf(closed, NOW)).toBe('CLOSED')
  })

  it('백엔드의 타임존 없는 시각을 UTC로 읽는다', () => {
    // 2026-10-05T03:00Z 기준, "03:30"(UTC)는 아직 시작 전이다.
    expect(phaseOf(asg(9, '2026-10-05T03:30:00', '2026-10-06T00:00:00'), NOW)).toBe('UPCOMING')
  })
})

describe('filterProgress', () => {
  it('기본은 시작된 과제만 — 예정된 과제는 전원 미제출이라 독촉할 대상이 아니다', () => {
    expect(ids(filterProgress(all, DEFAULT_PROGRESS_QUERY, NOW))).toEqual([2, 3])
  })

  it('단계별로 고를 수 있다', () => {
    const f = (phase: typeof DEFAULT_PROGRESS_QUERY.phase) =>
      ids(filterProgress(all, { ...DEFAULT_PROGRESS_QUERY, phase }, NOW))
    expect(f('UPCOMING')).toEqual([1])
    expect(f('CLOSED')).toEqual([3])
    expect(f('ALL')).toEqual([1, 2, 3])
  })

  it('트랙 공통 과제만 / 특정 트랙만', () => {
    const base = { ...DEFAULT_PROGRESS_QUERY, phase: 'ALL' as const }
    expect(ids(filterProgress(all, { ...base, track: 'NONE' }, NOW))).toEqual([1, 3])
    expect(ids(filterProgress(all, { ...base, track: 10 }, NOW))).toEqual([2])
  })

  it('플랜 공통 과제만 / 특정 플랜만', () => {
    const base = { ...DEFAULT_PROGRESS_QUERY, phase: 'ALL' as const }
    expect(ids(filterProgress(all, { ...base, plan: 'NONE' }, NOW))).toEqual([1, 2])
    expect(ids(filterProgress(all, { ...base, plan: 1 }, NOW))).toEqual([3])
  })
})

describe('membersInTab', () => {
  const m = (name: string, state: AssigneeStatus['state']): AssigneeStatus => ({
    user_id: name.charCodeAt(0), name, student_id: name, generation: 9, plan_name: null,
    track_names: [], state, submitted_at: null, updated_at: null, grade: null,
  })
  const members = [m('가', 'NONE'), m('나', 'DRAFT'), m('다', 'FINAL')]
  const tab = (t: Parameters<typeof membersInTab>[1]) => membersInTab(members, t).map((x) => x.name)

  it('미제출에는 임시 저장만 한 사람도 들어간다 — 최종 제출을 안 했다', () => {
    expect(tab('MISSING')).toEqual(['가', '나'])
  })

  it('나머지 탭', () => {
    expect(tab('DRAFT')).toEqual(['나'])
    expect(tab('FINAL')).toEqual(['다'])
    expect(tab('ALL')).toEqual(['가', '나', '다'])
  })
})

describe('reminderMessage', () => {
  it('진행 중이면 마감 시각을 알려준다', () => {
    const msg = reminderMessage(open, NOW)
    expect(msg).toContain("'과제2'")
    expect(msg).toContain('아직 제출하지 않았습니다')
    expect(msg).toMatch(/마감은 10월 \d+일/)
  })

  it('마감이 지났으면 그렇게 말한다', () => {
    expect(reminderMessage(closed, NOW)).toContain('마감이 지났습니다')
  })

  it('예정이면 곧 시작된다고 말한다', () => {
    expect(reminderMessage(upcoming, NOW)).toContain('곧 시작됩니다')
  })
})
