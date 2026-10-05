'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Bell, ClipboardCheck } from 'lucide-react'
import {
  getAssignmentAssignees,
  listAssignmentProgress,
  sendBulkNotification,
} from '@/lib/api/admin'
import { getMe } from '@/lib/api/auth'
import { listPlans } from '@/lib/api/plans'
import { listTracks } from '@/lib/api/tracks'
import { formatDeadlineShort, formatTimestamp } from '@/lib/formatDeadline'
import { parseAxis } from '@/lib/memberFilter'
import {
  DEFAULT_PROGRESS_QUERY,
  PHASE_FILTER_LABEL,
  PHASE_LABEL,
  STATE_TAB_LABEL,
  filterProgress,
  membersInTab,
  phaseOf,
  reminderMessage,
  type PhaseFilter,
  type ProgressQuery,
  type StateTab,
} from '@/lib/progress'
import { getStoredUser, saveAuth } from '@/lib/session'
import type { AssignmentAssignees, AssignmentProgress, Plan, Track, User } from '@/lib/types'
import LoadFailure from '@/components/LoadFailure'
import NotifyDialog from '@/components/admin/NotifyDialog'
import { errorMessage, useToast } from '@/components/Toast'

const STATE_BADGE: Record<'NONE' | 'DRAFT' | 'FINAL', { label: string; className: string }> = {
  NONE: { label: '미제출', className: 'bg-red-500/15 text-red-500' },
  DRAFT: { label: '임시 저장', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  FINAL: { label: '제출 완료', className: 'bg-green-500/15 text-green-600 dark:text-green-400' },
}

/** 주소에 고른 과제를 남겨 둔다. 새로고침하거나 링크를 공유해도 같은 화면이 열린다. */
function readSelectedFromUrl(): number | null {
  if (typeof window === 'undefined') return null
  const id = Number(new URLSearchParams(window.location.search).get('id'))
  return Number.isInteger(id) && id > 0 ? id : null
}

/**
 * 과제 제출 현황 (관리자 전용).
 *
 * 과제마다 "내야 하는 사람 중 누가 아직 안 냈는가"를 보고, 고른 사람들에게
 * 바로 독촉 알림을 보낸다. 대상자 판정은 서버가 열람 규칙 그대로 한다 —
 * 그 과제를 볼 수 있는 승인된 일반 회원이 곧 대상자다.
 */
export default function SubmissionProgressPage() {
  const router = useRouter()
  const toast = useToast()
  const [me, setMe] = useState<User | null>(() => getStoredUser<User>())

  const [progress, setProgress] = useState<AssignmentProgress[] | null>(null)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [query, setQuery] = useState<ProgressQuery>(DEFAULT_PROGRESS_QUERY)

  // 관리자인지 서버로 확인을 마쳤는가. 그 전에는 관리자 전용 API를 부르지 않는다.
  const [verified, setVerified] = useState(false)
  // 처음 값은 주소에서 바로 읽는다. 확인이 끝난 뒤에 읽으면, 그 사이 아래 effect가
  // 주소를 정리하면서 ?id=를 이미 지워버린다.
  const [selectedId, setSelectedId] = useState<number | null>(readSelectedFromUrl)
  const [detail, setDetail] = useState<AssignmentAssignees | null>(null)
  const [detailError, setDetailError] = useState<unknown>(null)
  const [tab, setTab] = useState<StateTab>('MISSING')
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [notifyOpen, setNotifyOpen] = useState(false)
  const detailRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!getStoredUser<User>()) {
      router.replace('/login')
      return
    }
    // 캐시된 role이 오래된 값일 수 있어 서버에서 다시 확인한다.
    getMe()
      .then((fresh) => {
        saveAuth(localStorage.getItem('token') ?? '', fresh)
        setMe(fresh)
        if (fresh.role !== 'ADMIN') {
          router.replace('/')
          return
        }
        listAssignmentProgress().then(setProgress).catch(setLoadError)
        // 필터 선택지일 뿐이라 실패해도 화면은 쓸 수 있다. 다만 알린다.
        listTracks().then(setTracks).catch((err) => toast(errorMessage(err), 'error'))
        listPlans().then(setPlans).catch((err) => toast(errorMessage(err), 'error'))
        setVerified(true)
      })
      .catch(() => router.replace('/login'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 과제를 고르면 대상자를 불러온다. 이전 과제의 선택은 버린다 — 남겨 두면
  // 다른 과제의 독촉이 엉뚱한 사람에게 갈 수 있다.
  useEffect(() => {
    if (!verified) return
    setChecked(new Set())
    setTab('MISSING')
    setDetail(null)
    setDetailError(null)
    if (typeof window !== 'undefined') {
      const url = selectedId ? `?id=${selectedId}` : window.location.pathname
      window.history.replaceState(null, '', url)
    }
    if (selectedId === null) return
    let cancelled = false
    getAssignmentAssignees(selectedId)
      .then((d) => !cancelled && setDetail(d))
      .catch((err) => !cancelled && setDetailError(err))
    // 빠르게 다른 과제를 누르면 늦게 도착한 앞의 응답이 화면을 덮어쓰지 않게 한다.
    return () => {
      cancelled = true
    }
  }, [selectedId, verified])

  const visible = useMemo(() => filterProgress(progress ?? [], query), [progress, query])
  const rows = useMemo(() => (detail ? membersInTab(detail.members, tab) : []), [detail, tab])
  const checkedRows = rows.filter((r) => checked.has(r.user_id))

  if (!me || me.role !== 'ADMIN') return null
  if (loadError) return <LoadFailure error={loadError} notFoundText="제출 현황을 찾을 수 없습니다." />

  function toggle(id: number) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allChecked = rows.length > 0 && rows.every((r) => checked.has(r.user_id))

  async function send(message: string) {
    if (!detail) return
    const r = await sendBulkNotification(
      checkedRows.map((m) => m.user_id),
      message,
      `/assignments/${detail.assignment.id}`
    )
    toast(`${r.sent}명에게 알림을 보냈습니다.`)
    setNotifyOpen(false)
    setChecked(new Set())
  }

  const countOf = (t: StateTab) => (detail ? membersInTab(detail.members, t).length : 0)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition mb-3"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        회원 관리
      </Link>
      <div className="flex items-center gap-2 mb-1">
        <ClipboardCheck aria-hidden="true" className="size-6 text-gray-900 dark:text-white" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">과제 제출 현황</h1>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 break-keep">
        과제를 고르면 내야 하는 회원과 제출 상태가 보입니다. 대상자는 트랙·플랜이 맞는 승인된
        일반 회원입니다.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={query.phase}
          onChange={(e) => setQuery((q) => ({ ...q, phase: e.target.value as PhaseFilter }))}
          aria-label="과제 단계"
          className="field"
        >
          {(Object.keys(PHASE_FILTER_LABEL) as PhaseFilter[]).map((k) => (
            <option key={k} value={k}>
              {PHASE_FILTER_LABEL[k]}
            </option>
          ))}
        </select>
        <select
          value={String(query.track)}
          onChange={(e) => setQuery((q) => ({ ...q, track: parseAxis(e.target.value) }))}
          aria-label="트랙으로 거르기"
          className="field"
        >
          <option value="ALL">모든 트랙</option>
          <option value="NONE">트랙 공통 과제</option>
          {tracks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          value={String(query.plan)}
          onChange={(e) => setQuery((q) => ({ ...q, plan: parseAxis(e.target.value) }))}
          aria-label="플랜으로 거르기"
          className="field"
        >
          <option value="ALL">모든 플랜</option>
          <option value="NONE">플랜 공통 과제</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-6">
        {/* ── 과제 목록 ── */}
        <section aria-label="과제 목록">
          {progress === null ? (
            <p className="text-sm text-gray-400">불러오는 중...</p>
          ) : visible.length === 0 ? (
            <p className="text-sm text-gray-400">조건에 맞는 과제가 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {visible.map((a) => {
                const phase = phaseOf(a)
                const ratio = a.assignees > 0 ? a.final / a.assignees : 0
                return (
                  <li key={a.id}>
                    <button
                      onClick={() => {
                        setSelectedId(a.id)
                        // 폰에서는 명단이 목록 아래에 쌓인다. 눌러도 화면이 그대로면
                        // 아무 일도 없는 것처럼 보여서, 명단으로 내려 준다.
                        if (window.matchMedia('(max-width: 767px)').matches) {
                          requestAnimationFrame(() =>
                            detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                          )
                        }
                      }}
                      aria-current={selectedId === a.id}
                      className={`w-full text-left panel rounded-xl px-4 py-3 transition ${
                        selectedId === a.id
                          ? 'border-gray-900 dark:border-white'
                          : 'hover:border-gray-400 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-gray-900 dark:text-white break-keep">{a.title}</p>
                        <span className="shrink-0 text-[11px] badge-neutral px-1.5 py-0.5 rounded">
                          {PHASE_LABEL[phase]}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-400">
                        {formatDeadlineShort(a.start_at, a.end_at)}
                        {' · '}
                        {a.track?.name ?? '트랙 공통'}
                        {' · '}
                        {a.plan?.name ?? '플랜 공통'}
                      </p>
                      <div
                        className="mt-2 h-1 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={a.assignees}
                        aria-valuenow={a.final}
                        aria-label={`${a.title} 제출률`}
                      >
                        <div className="h-full bg-gray-900 dark:bg-white" style={{ width: `${ratio * 100}%` }} />
                      </div>
                      <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                        제출 {a.final} / {a.assignees}
                        {a.draft > 0 && ` · 임시 저장 ${a.draft}`}
                        {a.missing > 0 && phase !== 'UPCOMING' && (
                          <span className="ml-1 text-red-500">· 미제출 {a.missing}</span>
                        )}
                      </p>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* ── 대상자 ── */}
        <section ref={detailRef} aria-label="대상자" className="md:sticky md:top-20 self-start w-full scroll-mt-16">
          {selectedId === null ? (
            <p className="text-sm text-gray-400 panel rounded-xl px-4 py-8 text-center">
              왼쪽에서 과제를 고르세요.
            </p>
          ) : detailError ? (
            <LoadFailure error={detailError} notFoundText="과제를 찾을 수 없습니다." className="py-12" />
          ) : !detail ? (
            <p className="text-sm text-gray-400">불러오는 중...</p>
          ) : (
            <div className="panel rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-semibold text-gray-900 dark:text-white break-keep">
                    {detail.assignment.title}
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    대상 {detail.assignment.assignees}명 · 제출 {detail.assignment.final} · 임시 저장{' '}
                    {detail.assignment.draft} · 미제출 {detail.assignment.missing}
                  </p>
                </div>
                <Link
                  href={`/assignments/${detail.assignment.id}`}
                  className="shrink-0 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white underline"
                >
                  과제 보기
                </Link>
              </div>

              <div role="tablist" className="mt-4 flex flex-wrap gap-1 border-b border-gray-100 dark:border-gray-800">
                {(Object.keys(STATE_TAB_LABEL) as StateTab[]).map((t) => (
                  <button
                    key={t}
                    role="tab"
                    aria-selected={tab === t}
                    onClick={() => {
                      setTab(t)
                      setChecked(new Set())
                    }}
                    className={`px-3 py-2 text-sm -mb-px border-b-2 transition ${
                      tab === t
                        ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white font-medium'
                        : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {STATE_TAB_LABEL[t]} {countOf(t)}
                  </button>
                ))}
              </div>

              {detail.members.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center break-keep">
                  이 과제를 받을 회원이 없습니다. 트랙·플랜이 맞는 승인된 회원이 있는지 확인하세요.
                </p>
              ) : rows.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">해당하는 회원이 없습니다.</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2 py-3">
                    <label className="inline-flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <input
                        type="checkbox"
                        checked={allChecked}
                        onChange={() =>
                          setChecked(allChecked ? new Set() : new Set(rows.map((r) => r.user_id)))
                        }
                        className="size-4 accent-gray-900 dark:accent-white"
                      />
                      이 탭 전체 선택
                    </label>
                    <button
                      onClick={() => setNotifyOpen(true)}
                      disabled={checkedRows.length === 0}
                      className="ml-auto btn-primary inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg disabled:opacity-40"
                    >
                      <Bell aria-hidden="true" className="size-3.5" />
                      {checkedRows.length > 0 ? `${checkedRows.length}명에게 알림` : '알림 보내기'}
                    </button>
                  </div>
                  <ul className="divide-y divide-gray-100 dark:divide-gray-800/60">
                    {rows.map((m) => (
                      <li key={m.user_id}>
                        <label className="flex items-center gap-3 py-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked.has(m.user_id)}
                            onChange={() => toggle(m.user_id)}
                            aria-label={`${m.name} 선택`}
                            className="size-4 shrink-0 accent-gray-900 dark:accent-white"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-gray-900 dark:text-white">
                              {m.name}{' '}
                              <span className="text-gray-400">
                                · {m.student_id} · {m.generation}기
                              </span>
                            </p>
                            <p className="text-xs text-gray-400 truncate">
                              {m.plan_name ?? '플랜 미배정'} · {m.track_names.join(', ') || '트랙 미배정'}
                              {m.state === 'FINAL' && m.submitted_at && ` · ${formatTimestamp(m.submitted_at)} 제출`}
                              {m.state === 'DRAFT' && m.updated_at && ` · ${formatTimestamp(m.updated_at)} 저장`}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 text-[11px] px-1.5 py-0.5 rounded font-medium ${STATE_BADGE[m.state].className}`}
                          >
                            {STATE_BADGE[m.state].label}
                            {m.grade && ` · ${m.grade === 'PASS' ? '합격' : '불합격'}`}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </section>
      </div>

      <NotifyDialog
        open={notifyOpen}
        recipients={checkedRows.map((m) => ({ id: m.user_id, name: m.name }))}
        defaultMessage={detail ? reminderMessage(detail.assignment) : ''}
        linkLabel={detail ? `'${detail.assignment.title}' 과제` : undefined}
        onClose={() => setNotifyOpen(false)}
        onSend={send}
      />
    </div>
  )
}
