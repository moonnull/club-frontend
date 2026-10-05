import { toDate } from './formatDeadline'
import type { AxisFilter } from './memberFilter'
import type { AssigneeStatus, AssignmentProgress } from './types'

/** 과제가 지금 어느 단계인가. */
export type Phase = 'UPCOMING' | 'OPEN' | 'CLOSED'

export const PHASE_LABEL: Record<Phase, string> = {
  UPCOMING: '예정',
  OPEN: '진행 중',
  CLOSED: '마감',
}

export function phaseOf(a: Pick<AssignmentProgress, 'start_at' | 'end_at'>, now = new Date()): Phase {
  if (now < toDate(a.start_at)) return 'UPCOMING'
  if (now > toDate(a.end_at)) return 'CLOSED'
  return 'OPEN'
}

/**
 * 과제 목록 필터. 기본은 "시작된 과제"(진행 중 + 마감) — 아직 시작하지 않은
 * 과제는 전원이 미제출이라 독촉할 대상이 아니다.
 */
export type PhaseFilter = 'STARTED' | Phase | 'ALL'

export const PHASE_FILTER_LABEL: Record<PhaseFilter, string> = {
  STARTED: '시작된 과제',
  OPEN: '진행 중',
  CLOSED: '마감',
  UPCOMING: '예정',
  ALL: '전체',
}

export interface ProgressQuery {
  phase: PhaseFilter
  /** 'NONE' = 트랙이 지정되지 않은(전원 공통) 과제 */
  track: AxisFilter
  /** 'NONE' = 플랜이 지정되지 않은(플랜 공통) 과제 */
  plan: AxisFilter
}

export const DEFAULT_PROGRESS_QUERY: ProgressQuery = { phase: 'STARTED', track: 'ALL', plan: 'ALL' }

function matchesAxis(value: { id: number } | null, filter: AxisFilter): boolean {
  if (filter === 'ALL') return true
  if (filter === 'NONE') return value === null
  return value?.id === filter
}

export function filterProgress(
  list: AssignmentProgress[],
  query: ProgressQuery,
  now = new Date()
): AssignmentProgress[] {
  return list.filter((a) => {
    const phase = phaseOf(a, now)
    const phaseOk =
      query.phase === 'ALL' ||
      (query.phase === 'STARTED' ? phase !== 'UPCOMING' : phase === query.phase)
    return phaseOk && matchesAxis(a.track, query.track) && matchesAxis(a.plan, query.plan)
  })
}

/** 대상자 탭. 기본은 "미제출" — 최종 제출을 하지 않은 사람(임시 저장만 한 사람 포함). */
export type StateTab = 'MISSING' | 'DRAFT' | 'FINAL' | 'ALL'

export const STATE_TAB_LABEL: Record<StateTab, string> = {
  MISSING: '미제출',
  DRAFT: '임시 저장만',
  FINAL: '제출 완료',
  ALL: '전체',
}

export function membersInTab(members: AssigneeStatus[], tab: StateTab): AssigneeStatus[] {
  if (tab === 'ALL') return members
  if (tab === 'MISSING') return members.filter((m) => m.state !== 'FINAL')
  return members.filter((m) => m.state === tab)
}

function formatEnd(iso: string): string {
  const d = toDate(iso)
  const h = d.getHours()
  const m = d.getMinutes()
  const ampm = h < 12 ? '오전' : '오후'
  const hour = h % 12 === 0 ? 12 : h % 12
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${ampm} ${hour}시${m ? ` ${m}분` : ''}`
}

/**
 * 독촉 알림의 기본 문구. 관리자가 매번 마감 시각을 찾아 적지 않아도 되게 한다.
 * 대화상자에서 고쳐 쓸 수 있다.
 */
export function reminderMessage(a: Pick<AssignmentProgress, 'title' | 'start_at' | 'end_at'>, now = new Date()): string {
  const phase = phaseOf(a, now)
  if (phase === 'CLOSED') return `'${a.title}' 과제의 마감이 지났습니다. 제출 상황을 확인해주세요.`
  if (phase === 'UPCOMING') return `'${a.title}' 과제가 곧 시작됩니다. 마감은 ${formatEnd(a.end_at)}입니다.`
  return `'${a.title}' 과제를 아직 제출하지 않았습니다. 마감은 ${formatEnd(a.end_at)}입니다.`
}
