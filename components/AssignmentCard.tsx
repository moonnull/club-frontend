'use client'
import Link from 'next/link'
import { CalendarDays, CircleCheck, FileDown, Lock } from 'lucide-react'
import { formatDeadlineShort, isBeforeStart, isPastDeadline } from '@/lib/formatDeadline'
import type { AssignmentListItem } from '@/lib/types'

/** 제출 상태 배지 — 유채색은 채점 결과(합격/불합격)에만 쓴다. */
function statusBadge(a: AssignmentListItem): { label: string; className: string } | null {
  if (a.submission_status === 'FINAL') {
    if (a.submission_grade === 'PASS') return { label: '합격', className: 'bg-green-500/15 text-green-600 dark:text-green-400' }
    if (a.submission_grade === 'FAIL') return { label: '불합격', className: 'bg-red-500/15 text-red-600 dark:text-red-400' }
    return { label: '제출 완료', className: 'badge-neutral' }
  }
  if (a.submission_status === 'DRAFT') return { label: '임시저장', className: 'badge-neutral' }
  // 아직 시작 전인 과제까지 "미제출"이라고 하면 불필요하게 재촉하는 느낌이라 제외한다.
  if (!isBeforeStart(a.start_at)) return { label: '미제출', className: 'badge-neutral' }
  return null
}

export default function AssignmentCard({
  assignment,
  active = false,
  showTrack = false,
}: {
  assignment: AssignmentListItem
  active?: boolean
  /** 여러 트랙이 섞여 보이는 목록에서만 트랙 배지를 노출한다. */
  showTrack?: boolean
}) {
  const closed = isPastDeadline(assignment.end_at)
  const notStarted = isBeforeStart(assignment.start_at)
  const badge = statusBadge(assignment)

  return (
    <Link
      href={`/assignments/${assignment.id}`}
      aria-current={active ? 'page' : undefined}
      className={`block rounded-xl border p-4 transition ${
        active
          ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-white/[0.06]'
          : 'border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-600'
      } ${
        // 마감된 과제는 흐리게 — 목록에서 진행 중인 과제가 먼저 눈에 들어오게 한다.
        closed && !active ? 'opacity-50 hover:opacity-100' : ''
      }`}
    >
      <div className="flex items-start gap-1.5">
        {closed ? (
          <CircleCheck aria-hidden="true" className="size-4 shrink-0 mt-px text-gray-400" />
        ) : notStarted ? (
          <Lock aria-hidden="true" className="size-4 shrink-0 mt-px text-gray-400" />
        ) : (
          <CalendarDays aria-hidden="true" className="size-4 shrink-0 mt-px text-gray-500 dark:text-gray-400" />
        )}
        <span className="font-semibold text-sm leading-snug text-gray-900 dark:text-white break-keep">
          {assignment.title}
        </span>
        {assignment.file_count > 0 && (
          <span
            className="ml-auto shrink-0 inline-flex items-center gap-0.5 text-xs text-gray-400"
            title={`첨부파일 ${assignment.file_count}개`}
          >
            <FileDown aria-hidden="true" className="size-3.5" />
            <span className="sr-only">첨부파일 </span>
            {assignment.file_count}
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {showTrack && assignment.track && (
          <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium badge-neutral">
            {assignment.track.name}
          </span>
        )}
        {badge && (
          <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${badge.className}`}>
            {badge.label}
          </span>
        )}
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {formatDeadlineShort(assignment.start_at, assignment.end_at)}
        </span>
        {notStarted && <span className="text-xs text-gray-400">· 시작 전</span>}
        {closed && <span className="text-xs text-gray-400">· 마감</span>}
      </div>
    </Link>
  )
}
