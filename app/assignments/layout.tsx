'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeftFromLine, ArrowRightFromLine, Plus } from 'lucide-react'
import AssignmentCard from '@/components/AssignmentCard'
import { listAssignments } from '@/lib/api/assignments'
import { getStoredUser } from '@/lib/session'
import { realtimeHub } from '@/lib/ws'
import type { AssignmentListItem, User } from '@/lib/types'

const ALL = 'ALL'
// 트랙이 지정되지 않아 모두에게 보이는 과제
const UNTRACKED = 'UNTRACKED'

export default function AssignmentsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const user = getStoredUser<User>()
  const [assignments, setAssignments] = useState<AssignmentListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [trackKey, setTrackKey] = useState<string>(ALL)
  const [collapsed, setCollapsed] = useState(false)
  const currentId = pathname.match(/^\/assignments\/(\d+)/)?.[1]

  useEffect(() => {
    listAssignments()
      .then(setAssignments)
      .finally(() => setLoading(false))
  }, [pathname])

  useEffect(() => {
    const offCreated = realtimeHub.on('assignment_created', (data) => {
      setAssignments((prev) => [data.assignment, ...prev])
    })
    const offDeleted = realtimeHub.on('assignment_deleted', (data) => {
      setAssignments((prev) => prev.filter((a) => a.id !== data.assignment_id))
      if (String(data.assignment_id) === currentId) router.push('/assignments')
    })
    return () => {
      offCreated()
      offDeleted()
    }
  }, [currentId])

  // 필터 후보는 실제로 보이는 과제에서 뽑는다 (접근 권한이 없는 트랙은 애초에 오지 않는다).
  // 트랙이 하나뿐이어도 트랙 없는 "공통" 과제가 섞여 있으면 필터가 의미 있다.
  const filters = useMemo(() => {
    const seen = new Map<string, string>()
    let hasUntracked = false
    for (const a of assignments) {
      if (a.track) seen.set(a.track.key, a.track.name)
      else hasUntracked = true
    }
    const options = [...seen].map(([key, name]) => ({ key, name }))
    if (hasUntracked) options.push({ key: UNTRACKED, name: '공통' })
    // 선택지가 하나뿐이면 필터를 보여줄 이유가 없다.
    return options.length > 1 ? [{ key: ALL, name: '전체' }, ...options] : []
  }, [assignments])

  const visible = useMemo(() => {
    if (trackKey === ALL) return assignments
    if (trackKey === UNTRACKED) return assignments.filter((a) => !a.track)
    return assignments.filter((a) => a.track?.key === trackKey)
  }, [assignments, trackKey])

  if (collapsed) {
    return (
      <div className="flex h-[calc(100vh-56px)]">
        <div className="shrink-0 border-r border-gray-200 dark:border-gray-800 surface px-2 py-3">
          <button
            onClick={() => setCollapsed(false)}
            aria-label="과제 목록 펼치기"
            title="과제 목록 펼치기"
            className="btn-secondary rounded-lg p-2 inline-flex items-center justify-center"
          >
            <ArrowRightFromLine aria-hidden="true" className="size-4" />
          </button>
        </div>
        <div className="flex-1 min-w-0 overflow-y-auto">{children}</div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-56px)]">
      <aside className="w-[300px] shrink-0 border-r border-gray-200 dark:border-gray-800 surface flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-bold text-gray-900 dark:text-white">과제</h2>
            <div className="flex items-center gap-1.5">
              {user?.role === 'ADMIN' && (
                <button
                  onClick={() => router.push('/assignments/new')}
                  aria-label="과제 등록"
                  title="과제 등록"
                  className="btn-primary rounded-lg p-2 inline-flex items-center justify-center"
                >
                  <Plus aria-hidden="true" className="size-4" />
                </button>
              )}
              <button
                onClick={() => setCollapsed(true)}
                aria-label="과제 목록 접기"
                title="과제 목록 접기"
                className="btn-secondary rounded-lg p-2 inline-flex items-center justify-center"
              >
                <ArrowLeftFromLine aria-hidden="true" className="size-4" />
              </button>
            </div>
          </div>

          {filters.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {filters.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTrackKey(t.key)}
                  aria-pressed={trackKey === t.key}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition ${
                    trackKey === t.key
                      ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                      : 'badge-neutral hover:opacity-80'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {loading ? (
            <p className="text-xs text-gray-400">불러오는 중...</p>
          ) : visible.length === 0 ? (
            <p className="text-xs text-gray-400">
              {trackKey === ALL ? '등록된 과제가 없습니다.' : '이 트랙에는 과제가 없습니다.'}
            </p>
          ) : (
            visible.map((a) => (
              <AssignmentCard
                key={a.id}
                assignment={a}
                active={String(a.id) === currentId}
                showTrack={trackKey === ALL && filters.length > 0}
              />
            ))
          )}
        </nav>
      </aside>

      <div className="flex-1 min-w-0 overflow-y-auto">{children}</div>
    </div>
  )
}
