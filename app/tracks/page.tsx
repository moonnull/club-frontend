'use client'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronRight, Layers } from 'lucide-react'
import { getTrackSummaries } from '@/lib/api/assignments'
import { listTracks } from '@/lib/api/tracks'
import { getStoredUser } from '@/lib/session'
import { isAssignmentStaff } from '@/lib/role'
import { errorMessage, useToast } from '@/components/Toast'
import { duration, toDate } from '@/lib/formatDeadline'
import type { Track, TrackAssignmentSummary, User } from '@/lib/types'

export default function TracksPage() {
  const toast = useToast()
  const me = getStoredUser<User>()
  // 관리자·멘토는 과제를 운영하는 쪽이다. 플랜·트랙 제한 없이 과제를 보므로
  // 트랙 목록도 전부 보여준다 — 자기 트랙만 보이면 방금 낸 과제가 어디에도
  // 안 보이는 상황이 생긴다. 제출할 일도 없어 제출 진행률이 늘 0이라,
  // 마감 진행률을 대신 보여준다.
  const isStaff = isAssignmentStaff(me)
  // 예전 세션의 localStorage 캐시에는 tracks가 없을 수 있다.
  const myTrackIds = me?.tracks?.map((t) => t.id) ?? []
  const [tracks, setTracks] = useState<Track[]>([])
  // 카드에 필요한 건 트랙별 과제 수·기간·진행률뿐이다. 전체 과제를 받아
  // 클라이언트에서 세면 과제가 쌓일수록 이 화면만 무거워진다.
  const [summaries, setSummaries] = useState<TrackAssignmentSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([listTracks(), getTrackSummaries()])
      .then(([t, s]) => {
        setTracks(t)
        setSummaries(s)
      })
      .catch((err) => toast(errorMessage(err), 'error'))
      .finally(() => setLoading(false))
  }, [toast])

  // 관리자·멘토는 전체 트랙을, 회원은 자기가 수강 중인 트랙만 본다.
  // 과제 목록은 이미 트랙별로 필터링되어 오므로, 남의 트랙을 보여주면
  // "과제 0개"인 빈 카드만 늘어서 오히려 혼란스럽다.
  const visibleTracks = useMemo(
    () => (isStaff ? tracks : tracks.filter((t) => myTrackIds.includes(t.id))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tracks, isStaff, myTrackIds.join(',')],
  )

  // 서버가 준 집계를 트랙 카드에 붙인다. 과제가 하나도 없는 트랙은
  // 집계에 나타나지 않으므로 0으로 채운다.
  const cards = useMemo(() => {
    const byTrack = new Map(summaries.map((s) => [s.track_id, s]))
    return visibleTracks.map((track) => {
      const s = byTrack.get(track.id)
      return {
        track,
        count: s?.count ?? 0,
        span:
          s?.first_start_at && s.last_end_at
            ? duration(toDate(s.first_start_at), toDate(s.last_end_at))
            : null,
        done: s?.done ?? 0,
      }
    })
  }, [visibleTracks, summaries])

  // 트랙이 지정되지 않은(전원 공통) 과제는 집계에서 track_id가 null인 항목이다.
  const untracked = summaries.find((s) => s.track_id === null)?.count ?? 0

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center gap-2 mb-1">
        <Layers aria-hidden="true" className="size-6 text-gray-900 dark:text-white" />
        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">트랙</h1>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
        {isStaff
          ? '전체 트랙입니다. 트랙을 선택하면 해당 과정의 과제를 순서대로 볼 수 있습니다.'
          : '내가 수강 중인 트랙입니다. 선택하면 과제를 순서대로 볼 수 있습니다.'}
      </p>

      {loading ? (
        <p className="text-sm text-gray-400">불러오는 중...</p>
      ) : summaries.length === 0 ? (
        <p className="text-sm text-gray-400">
          {isStaff
            ? '등록된 트랙이 없습니다.'
            : '아직 배정된 트랙이 없습니다. 관리자에게 문의해주세요.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {cards.map(({ track, count, span, done }) => (
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
                    aria-label={`${track.name} ${isStaff ? '마감' : '제출'} 진행률`}
                  >
                    <div
                      className="h-full bg-gray-900 dark:bg-white transition-all"
                      style={{ width: `${(done / count) * 100}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-gray-400">
                    {isStaff ? '마감' : '제출'} {done} / {count}
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
