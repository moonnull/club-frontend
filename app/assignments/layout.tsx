'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeftFromLine, ArrowRightFromLine, Plus } from 'lucide-react'
import AssignmentCard from '@/components/AssignmentCard'
import { listAssignments } from '@/lib/api/assignments'
import { getStoredUser } from '@/lib/session'
import { isAssignmentStaff } from '@/lib/role'
import { realtimeHub } from '@/lib/ws'
import type { AssignmentListItem, User } from '@/lib/types'

const ALL = 'ALL'
// 트랙/플랜이 지정되지 않아 모두에게 보이는 과제
const NONE = 'NONE'

/** 목록에 실제로 있는 값에서만 필터 후보를 뽑는다 (볼 수 없는 트랙·플랜은 애초에 오지 않는다).
 *  선택지가 하나뿐이면 필터를 보여줄 이유가 없으므로 빈 배열을 돌려준다. */
function buildFilters(
  assignments: AssignmentListItem[],
  pick: (a: AssignmentListItem) => { key: string; name: string } | null | undefined,
  noneLabel: string
) {
  const seen = new Map<string, string>()
  let hasNone = false
  for (const a of assignments) {
    const value = pick(a)
    if (value) seen.set(value.key, value.name)
    else hasNone = true
  }
  const options = [...seen].map(([key, name]) => ({ key, name }))
  if (hasNone) options.push({ key: NONE, name: noneLabel })
  return options.length > 1 ? [{ key: ALL, name: '전체' }, ...options] : []
}

function FilterChips({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { key: string; name: string }[]
  value: string
  onChange: (key: string) => void
}) {
  if (options.length === 0) return null
  return (
    <div className="mt-3 flex items-center gap-1.5">
      <span className="shrink-0 text-[10px] text-gray-400 w-7">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            aria-pressed={value === o.key}
            className={`text-xs px-2.5 py-1 rounded-full font-medium transition ${
              value === o.key
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                : 'badge-neutral hover:opacity-80'
            }`}
          >
            {o.name}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function AssignmentsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const user = getStoredUser<User>()
  const [assignments, setAssignments] = useState<AssignmentListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [trackKey, setTrackKey] = useState<string>(ALL)
  const [planKey, setPlanKey] = useState<string>(ALL)
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

  // 트랙이 하나뿐이어도 지정이 없는 "공통" 과제가 섞여 있으면 필터가 의미 있다.
  const trackFilters = useMemo(() => buildFilters(assignments, (a) => a.track, '공통'), [assignments])
  // 비기너/미들처럼 플랜이 다른 과제는 서로 보이지 않으므로, 회원에게 뜨는 선택지는
  // 보통 "내 플랜 + 공통"이다. 관리자에게만 전체 플랜이 나온다.
  const planFilters = useMemo(() => buildFilters(assignments, (a) => a.plan, '공통'), [assignments])

  const visible = useMemo(
    () =>
      assignments.filter((a) => {
        const trackOk =
          trackKey === ALL || (trackKey === NONE ? !a.track : a.track?.key === trackKey)
        const planOk = planKey === ALL || (planKey === NONE ? !a.plan : a.plan?.key === planKey)
        return trackOk && planOk
      }),
    [assignments, trackKey, planKey]
  )

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
              {isAssignmentStaff(user) && (
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

          <FilterChips label="플랜" options={planFilters} value={planKey} onChange={setPlanKey} />
          <FilterChips label="트랙" options={trackFilters} value={trackKey} onChange={setTrackKey} />
        </div>

        <nav className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {loading ? (
            <p className="text-xs text-gray-400">불러오는 중...</p>
          ) : visible.length === 0 ? (
            <p className="text-xs text-gray-400">
              {trackKey === ALL && planKey === ALL
                ? '등록된 과제가 없습니다.'
                : '선택한 조건에 맞는 과제가 없습니다.'}
            </p>
          ) : (
            visible.map((a) => (
              <AssignmentCard
                key={a.id}
                assignment={a}
                active={String(a.id) === currentId}
                showTrack={trackKey === ALL && trackFilters.length > 0}
                showPlan={planKey === ALL && planFilters.length > 0}
              />
            ))
          )}
        </nav>
      </aside>

      <div className="flex-1 min-w-0 overflow-y-auto">{children}</div>
    </div>
  )
}
