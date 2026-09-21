'use client'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CalendarDays } from 'lucide-react'
import AssignmentCard from '@/components/AssignmentCard'
import { errorMessage, useToast } from '@/components/Toast'
import { listAssignments } from '@/lib/api/assignments'
import { listTracks } from '@/lib/api/tracks'
import { getStoredUser } from '@/lib/session'
import { isAssignmentStaff } from '@/lib/role'
import { duration, isPastDeadline, toDate } from '@/lib/formatDeadline'
import { realtimeHub } from '@/lib/ws'
import type { AssignmentListItem, Track, User } from '@/lib/types'

export default function TrackDetailPage() {
  const toast = useToast()
  const me = getStoredUser<User>()
  // 관리자·멘토는 과제를 운영하는 쪽 — 모든 트랙을 보고, 제출할 일이 없다.
  const isStaff = isAssignmentStaff(me)
  const { id } = useParams<{ id: string }>()
  const trackId = Number(id)
  // 수강 중이 아닌 트랙은 URL로 직접 들어와도 막는다. (과제 자체는 서버가
  // 이미 걸러주지만, 트랙 이름과 커리큘럼 구성까지 보여줄 이유는 없다)
  // trackId를 읽으므로 반드시 그 선언 뒤에 와야 한다.
  const canView = isStaff || (me?.tracks?.some((t) => t.id === trackId) ?? false)
  const [track, setTrack] = useState<Track | null>(null)
  const [assignments, setAssignments] = useState<AssignmentListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 이 트랙의 과제만 받는다. 전체를 받아 걸러내면 과제가 쌓일수록 무거워진다.
    Promise.all([listTracks(), listAssignments({ trackId })])
      .then(([tracks, all]) => {
        setTrack(tracks.find((t) => t.id === trackId) ?? null)
        setAssignments(all)
      })
      .catch((err) => toast(errorMessage(err), 'error'))
      .finally(() => setLoading(false))
  }, [trackId, toast])

  useEffect(() => {
    const offCreated = realtimeHub.on('assignment_created', (data) => {
      setAssignments((prev) => [data.assignment, ...prev])
    })
    const offDeleted = realtimeHub.on('assignment_deleted', (data) => {
      setAssignments((prev) => prev.filter((a) => a.id !== data.assignment_id))
    })
    return () => {
      offCreated()
      offDeleted()
    }
  }, [])

  // 과제는 시작일 순으로 — 주차 순서대로 읽히게 한다.
  const items = useMemo(
    () =>
      assignments
        // 서버가 이미 걸러 주지만, 실시간으로 들어오는 과제는 트랙을 가리지 않고
        // 도착하므로 여기서 한 번 더 거른다.
        .filter((a) => a.track?.id === trackId)
        .sort((a, b) => toDate(a.start_at).getTime() - toDate(b.start_at).getTime()),
    [assignments, trackId],
  )

  const span = useMemo(() => {
    if (items.length === 0) return null
    const starts = items.map((a) => toDate(a.start_at).getTime())
    const ends = items.map((a) => toDate(a.end_at).getTime())
    return duration(new Date(Math.min(...starts)), new Date(Math.max(...ends)))
  }, [items])

  const closed = items.filter((a) => isPastDeadline(a.end_at)).length
  const submitted = items.filter((a) => a.submission_status === 'FINAL').length

  if (loading) {
    return <p className="max-w-3xl mx-auto px-4 py-10 text-sm text-gray-400">불러오는 중...</p>
  }

  if (!track || !canView) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          존재하지 않거나 접근할 수 없는 트랙입니다.
        </p>
        <Link href="/tracks" className="mt-3 inline-block text-sm underline">
          트랙 목록으로
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link
        href="/tracks"
        className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        트랙 목록
      </Link>

      <header className="mt-4 pb-5 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight break-keep">
          {track.name}
        </h1>
        <div className="mt-2 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
          <CalendarDays aria-hidden="true" className="size-4" />
          <span>{span ? `${span} 과정` : '기간 미정'}</span>
          <span aria-hidden="true">·</span>
          <span>과제 {items.length}개</span>
          {items.length > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span>마감 {closed}개</span>
              {!isStaff && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>제출 {submitted}개</span>
                </>
              )}
            </>
          )}
        </div>
      </header>

      {items.length === 0 ? (
        <p className="mt-8 text-sm text-gray-400">이 트랙에 등록된 과제가 없습니다.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {items.map((a) => (
            <AssignmentCard key={a.id} assignment={a} showPlan />
          ))}
        </div>
      )}
    </div>
  )
}
