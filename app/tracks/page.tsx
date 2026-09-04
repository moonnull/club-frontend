'use client'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronRight, Layers } from 'lucide-react'
import { listAssignments } from '@/lib/api/assignments'
import { listTracks } from '@/lib/api/tracks'
import { getStoredUser } from '@/lib/session'
import { errorMessage, useToast } from '@/components/Toast'
import { duration, isPastDeadline, toDate } from '@/lib/formatDeadline'
import type { AssignmentListItem, Track, User } from '@/lib/types'

export default function TracksPage() {
  const toast = useToast()
  const me = getStoredUser<User>()
  // 관리자는 제출할 일이 없어 제출 진행률이 늘 0이므로, 마감 진행률을 대신 보여준다.
  const isAdmin = me?.role === 'ADMIN'
  // 예전 세션의 localStorage 캐시에는 tracks가 없을 수 있다.
  const myTrackIds = me?.tracks?.map((t) => t.id) ?? []
  const [tracks, setTracks] = useState<Track[]>([])
  const [assignments, setAssignments] = useState<AssignmentListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([listTracks(), listAssignments()])
      .then(([t, a]) => {
        setTracks(t)
        setAssignments(a)
      })
      .catch((err) => toast(errorMessage(err), 'error'))
      .finally(() => setLoading(false))
  }, [toast])

  // 관리자는 전체 트랙을, 회원은 자기가 수강 중인 트랙만 본다.
  // 과제 목록은 이미 트랙별로 필터링되어 오므로, 남의 트랙을 보여주면
  // "과제 0개"인 빈 카드만 늘어서 오히려 혼란스럽다.
  const visibleTracks = useMemo(
    () => (isAdmin ? tracks : tracks.filter((t) => myTrackIds.includes(t.id))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tracks, isAdmin, myTrackIds.join(',')],
  )

  // 트랙별 요약(과제 수, 전체 기간, 진행률)을 한 번에 계산해 카드에 쓴다.
  const summaries = useMemo(() => {
    return visibleTracks.map((track) => {
      const items = assignments.filter((a) => a.track?.id === track.id)
      const starts = items.map((a) => toDate(a.start_at).getTime())
      const ends = items.map((a) => toDate(a.end_at).getTime())
      const done = isAdmin
        ? items.filter((a) => isPastDeadline(a.end_at)).length
        : items.filter((a) => a.submission_status === 'FINAL').length
      return {
        track,
        count: items.length,
        span:
          items.length > 0
            ? duration(new Date(Math.min(...starts)), new Date(Math.max(...ends)))
            : null,
        done,
      }
    })
  }, [visibleTracks, assignments, isAdmin])

  const untracked = assignments.filter((a) => !a.track).length

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center gap-2 mb-1">
        <Layers aria-hidden="true" className="size-6 text-gray-900 dark:text-white" />
        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">트랙</h1>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
        {isAdmin
          ? '전체 트랙입니다. 트랙을 선택하면 해당 과정의 과제를 순서대로 볼 수 있습니다.'
          : '내가 수강 중인 트랙입니다. 선택하면 과제를 순서대로 볼 수 있습니다.'}
      </p>

      {loading ? (
        <p className="text-sm text-gray-400">불러오는 중...</p>
      ) : summaries.length === 0 ? (
        <p className="text-sm text-gray-400">
          {isAdmin
            ? '등록된 트랙이 없습니다.'
            : '아직 배정된 트랙이 없습니다. 관리자에게 문의해주세요.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {summaries.map(({ track, count, span, done }) => (
            <Link
              key={track.id}
              href={`/tracks/${track.id}`}
              className="group panel rounded-2xl p-5 hover:border-gray-400 dark:hover:border-gray-600 transition"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-bold text-gray-900 dark:text-white group-hover:underline break-keep">
                  {track.name}
                </h2>
                <ChevronRight
                  aria-hidden="true"
                  className="size-4 shrink-0 mt-0.5 text-gray-400 group-hover:translate-x-0.5 transition"
                />
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                <CalendarDays aria-hidden="true" className="size-3.5" />
                <span>{span ? `${span} 과정` : '기간 미정'}</span>
                <span aria-hidden="true">·</span>
                <span>과제 {count}개</span>
              </div>
              {count > 0 && (
                <div className="mt-3">
                  <div
                    className="h-1 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={count}
                    aria-valuenow={done}
                    aria-label={`${track.name} ${isAdmin ? '마감' : '제출'} 진행률`}
                  >
                    <div
                      className="h-full bg-gray-900 dark:bg-white transition-all"
                      style={{ width: `${(done / count) * 100}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-gray-400">
                    {isAdmin ? '마감' : '제출'} {done} / {count}
                  </p>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {!loading && untracked > 0 && (
        <p className="mt-8 text-xs text-gray-400">
          트랙이 지정되지 않은 과제 {untracked}개는{' '}
          <Link href="/assignments" className="underline hover:text-gray-600 dark:hover:text-gray-200">
            과제 목록
          </Link>
          에서 볼 수 있습니다.
        </p>
      )}
    </div>
  )
}
