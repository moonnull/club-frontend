'use client'
import Link from 'next/link'
import { Database } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  approveUser,
  assignPlanToUsers,
  assignTracksToUsers,
  assignUserPlan,
  assignUserTracks,
  updateUserPenalty,
  deleteUser,
  listUsers,
  resetUserPassword,
  sendNotification,
  updateUserRole,
} from '@/lib/api/admin'
import { createBoard, deleteBoard, listBoards, updateBoard } from '@/lib/api/boards'
import { createTrack, deleteTrack, listTracks, updateTrack } from '@/lib/api/tracks'
import { createPlan, deletePlan, listPlans, updatePlan } from '@/lib/api/plans'
import { getMe } from '@/lib/api/auth'
import { getStoredUser, saveAuth } from '@/lib/session'
import { ROLE_LABEL } from '@/lib/role'
import type { BoardCategory, Plan, Track, User } from '@/lib/types'
import KeyedListSection from '@/components/admin/KeyedListSection'
import { errorMessage, useToast } from '@/components/Toast'
import { useConfirm } from '@/components/ConfirmDialog'
import TrackMultiSelect from '@/components/TrackMultiSelect'
import PenaltyStepper from '@/components/PenaltyStepper'

type SortKey = 'name' | 'generation' | 'created'
type UnassignedFilter = 'ALL' | 'NO_PLAN' | 'NO_TRACK'

const SORT_LABEL: Record<SortKey, string> = {
  name: '이름순',
  generation: '기수순',
  created: '가입순',
}

const UNASSIGNED_LABEL: Record<UnassignedFilter, string> = {
  ALL: '전체',
  NO_PLAN: '플랜 미배정',
  NO_TRACK: '트랙 미배정',
}

export default function AdminPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const router = useRouter()
  const [me, setMe] = useState<User | null>(() => getStoredUser<User>())
  const [users, setUsers] = useState<User[]>([])
  const [boards, setBoards] = useState<BoardCategory[]>([])
  const [tracks, setTracks] = useState<Track[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // 회원 목록 찾기 도구. 가입순으로만 늘어놓으면 배정할 사람을 눈으로 찾아야 해서
  // 인원이 늘수록 시간이 급격히 늘어난다.
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [unassigned, setUnassigned] = useState<UnassignedFilter>('ALL')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  // TrackMultiSelect는 체크할 때마다 onChange를 쏜다. 일괄 배정에서는 그때마다
  // 확인 창이 떠서 트랙을 두 개 고를 수가 없으므로, 선택을 모았다가 적용한다.
  const [bulkTrackIds, setBulkTrackIds] = useState<number[]>([])

  useEffect(() => {
    if (!getStoredUser<User>()) {
      router.replace('/login')
      return
    }
    // 캐시된 role이 오래된 값일 수 있어(예: 방금 관리자로 지정된 경우) 서버에서
    // 최신 정보를 다시 가져와 확인한다.
    getMe()
      .then((fresh) => {
        saveAuth(localStorage.getItem('token') ?? '', fresh)
        setMe(fresh)
        if (fresh.role !== 'ADMIN') {
          router.replace('/')
          return
        }
        load()
        loadBoards()
        loadTracks()
        loadPlans()
      })
      .catch(() => router.replace('/login'))
  }, [])

  function load() {
    setLoading(true)
    listUsers()
      .then(setUsers)
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
  }

  // 보조 목록의 실패도 알린다. 삼키면 추가·삭제 후 목록만 낡은 채로 남고
  // 사용자는 동작이 안 먹은 건지 갱신이 안 된 건지 구분할 수 없다.
  function loadBoards() {
    listBoards().then(setBoards).catch((err) => toast(errorMessage(err), 'error'))
  }

  function loadTracks() {
    listTracks().then(setTracks).catch((err) => toast(errorMessage(err), 'error'))
  }

  async function approve(userId: number) {
    try {
      await approveUser(userId)
      load()
    } catch (err: unknown) {
      toast(errorMessage(err), 'error')
    }
  }

  async function changeRole(user: User, nextRole: User['role']) {
    if (nextRole === user.role) return
    const confirmed = await confirm({
      message: `${user.name} 님의 역할을 ${ROLE_LABEL[nextRole]}(으)로 변경할까요?`,
      confirmLabel: '변경',
    })
    if (!confirmed) return
    try {
      await updateUserRole(user.id, nextRole)
      load()
    } catch (err: unknown) {
      toast(errorMessage(err), 'error')
    }
  }

  async function remove(user: User) {
    const confirmed = await confirm({
      message: `${user.name} 님을 삭제할까요?\n이 작업은 되돌릴 수 없습니다.`,
      confirmLabel: '삭제',
      destructive: true,
    })
    if (!confirmed) return
    try {
      await deleteUser(user.id)
      load()
    } catch (err: unknown) {
      toast(errorMessage(err), 'error')
    }
  }

  async function resetPassword(user: User) {
    const confirmed = await confirm({
      message: `${user.name} 님의 비밀번호를 초기화할까요?\n새 임시 비밀번호가 발급됩니다.`,
      confirmLabel: '초기화',
      destructive: true,
    })
    if (!confirmed) return
    try {
      const { temporary_password } = await resetUserPassword(user.id)
      window.prompt(`${user.name} 님의 임시 비밀번호입니다. 복사해서 안전하게 전달해주세요.`, temporary_password)
    } catch (err: unknown) {
      toast(errorMessage(err), 'error')
    }
  }

  async function changeTracks(user: User, trackIds: number[]) {
    try {
      await assignUserTracks(user.id, trackIds)
      load()
    } catch (err: unknown) {
      toast(errorMessage(err), 'error')
    }
  }

  async function sendUserNotification(user: User) {
    const message = window.prompt(`${user.name} 님에게 보낼 알림 메시지를 입력하세요.`)
    if (!message || !message.trim()) return
    try {
      await sendNotification(user.id, message.trim())
      toast('알림을 보냈습니다.')
    } catch (err: unknown) {
      toast(errorMessage(err), 'error')
    }
  }

  // 입력값과 오류는 구역(KeyedListSection)이 들고 있다. 여기는 보내기만 하고,
  // 실패하면 그대로 던져서 폼 안에 표시되게 한다.
  async function addBoard(key: string, name: string) {
    // 새 게시판은 전체 작성 허용으로 시작한다. 목록에서 바로 전환할 수 있다.
    await createBoard({ key, name, admin_only: false })
    loadBoards()
  }

  async function renameBoard(board: BoardCategory) {
    const name = prompt('새 게시판 이름을 입력하세요.', board.name)
    if (!name || name === board.name) return
    try {
      await updateBoard(board.id, { name })
      loadBoards()
    } catch (err: unknown) {
      toast(errorMessage(err), 'error')
    }
  }

  async function toggleAdminOnly(board: BoardCategory) {
    try {
      await updateBoard(board.id, { admin_only: !board.admin_only })
      loadBoards()
    } catch (err: unknown) {
      toast(errorMessage(err), 'error')
    }
  }

  async function removeBoard(board: BoardCategory) {
    const confirmed = await confirm({
      message: `'${board.name}' 게시판을 삭제할까요?`,
      confirmLabel: '삭제',
      destructive: true,
    })
    if (!confirmed) return
    try {
      await deleteBoard(board.id)
      loadBoards()
    } catch (err: unknown) {
      toast(errorMessage(err), 'error')
    }
  }

  // 입력값과 오류는 구역(KeyedListSection)이 들고 있다. 여기는 보내기만 하고,
  // 실패하면 그대로 던져서 폼 안에 표시되게 한다.
  async function addTrack(key: string, name: string) {
    await createTrack({ key, name })
    loadTracks()
  }

  async function renameTrack(track: Track) {
    const name = prompt('새 트랙 이름을 입력하세요.', track.name)
    if (!name || name === track.name) return
    try {
      await updateTrack(track.id, { name })
      loadTracks()
    } catch (err: unknown) {
      toast(errorMessage(err), 'error')
    }
  }

  async function removeTrack(track: Track) {
    const confirmed = await confirm({
      message: `'${track.name}' 트랙을 삭제할까요?`,
      confirmLabel: '삭제',
      destructive: true,
    })
    if (!confirmed) return
    try {
      await deleteTrack(track.id)
      loadTracks()
    } catch (err: unknown) {
      toast(errorMessage(err), 'error')
    }
  }

  function loadPlans() {
    listPlans().then(setPlans).catch((err) => toast(errorMessage(err), 'error'))
  }

  // 입력값과 오류는 구역(KeyedListSection)이 들고 있다. 여기는 보내기만 하고,
  // 실패하면 그대로 던져서 폼 안에 표시되게 한다.
  async function addPlan(key: string, name: string) {
    await createPlan({ key, name })
    loadPlans()
  }

  async function renamePlan(plan: Plan) {
    const name = prompt('새 플랜 이름을 입력하세요.', plan.name)
    if (!name || name === plan.name) return
    try {
      await updatePlan(plan.id, { name })
      loadPlans()
    } catch (err: unknown) {
      toast(errorMessage(err), 'error')
    }
  }

  async function removePlan(plan: Plan) {
    const confirmed = await confirm({
      message: `'${plan.name}' 플랜을 삭제할까요?`,
      confirmLabel: '삭제',
      destructive: true,
    })
    if (!confirmed) return
    try {
      await deletePlan(plan.id)
      loadPlans()
    } catch (err: unknown) {
      toast(errorMessage(err), 'error')
    }
  }

  async function changePlan(user: User, planId: string) {
    try {
      await assignUserPlan(user.id, planId ? Number(planId) : null)
      load()
    } catch (err: unknown) {
      toast(errorMessage(err), 'error')
    }
  }

  async function changePenalty(user: User, caution: number, warning: number) {
    // 0 미만으로는 내려가지 않게 한다 (백엔드도 ge=0으로 막고 있다).
    try {
      await updateUserPenalty(user.id, Math.max(0, caution), Math.max(0, warning))
      load()
    } catch (err: unknown) {
      toast(errorMessage(err), 'error')
    }
  }

  if (!me || me.role !== 'ADMIN') return null

  const pending = users.filter((u) => !u.is_active)

  // 검색 → 미배정 필터 → 정렬 순으로 좁힌다.
  const approved = users
    .filter((u) => u.is_active)
    .filter((u) => {
      if (!search.trim()) return true
      const q = search.trim().toLowerCase()
      return (
        u.name.toLowerCase().includes(q) ||
        u.student_id.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      )
    })
    .filter((u) => {
      if (unassigned === 'NO_PLAN') return !u.plan
      if (unassigned === 'NO_TRACK') return (u.tracks ?? []).length === 0
      return true
    })
    .sort((a, b) => {
      // 한글 이름은 코드포인트 순서가 가나다순과 다르므로 로케일 비교를 쓴다.
      if (sortKey === 'name') return a.name.localeCompare(b.name, 'ko')
      if (sortKey === 'generation') {
        return b.generation - a.generation || a.name.localeCompare(b.name, 'ko')
      }
      return b.created_at.localeCompare(a.created_at)
    })

  // 화면에 보이지 않는 사람이 선택에 남아 있으면, 일괄 배정이 의도치 않은
  // 대상까지 건드린다. 보이는 목록으로 항상 교집합을 잡는다.
  const visibleSelectedIds = approved.filter((u) => selectedIds.has(u.id)).map((u) => u.id)

  function toggleSelected(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    const allChecked = approved.length > 0 && approved.every((u) => selectedIds.has(u.id))
    setSelectedIds(allChecked ? new Set() : new Set(approved.map((u) => u.id)))
  }

  async function bulkPlan(planId: number | null) {
    const ids = visibleSelectedIds
    if (ids.length === 0) return
    const label = planId === null ? '플랜 배정 해제' : plans.find((p) => p.id === planId)?.name
    const confirmed = await confirm({
      message: `선택한 ${ids.length}명을 ${label}(으)로 변경할까요?`,
      confirmLabel: '변경',
    })
    if (!confirmed) return
    setBulkBusy(true)
    try {
      const r = await assignPlanToUsers(ids, planId)
      toast(`${r.updated}명의 플랜을 변경했습니다.`)
      setSelectedIds(new Set())
      load()
    } catch (err: unknown) {
      toast(errorMessage(err), 'error')
    } finally {
      setBulkBusy(false)
    }
  }

  async function bulkTracks(trackIds: number[]) {
    const ids = visibleSelectedIds
    if (ids.length === 0) return
    const names = tracks.filter((t) => trackIds.includes(t.id)).map((t) => t.name)
    const confirmed = await confirm({
      // 트랙은 "추가"가 아니라 "대체"라서, 기존 구성이 사라진다는 걸 분명히 알린다.
      message:
        names.length === 0
          ? `선택한 ${ids.length}명의 트랙 배정을 모두 해제할까요?`
          : `선택한 ${ids.length}명의 트랙을 ${names.join(', ')}(으)로 바꿉니다.\n기존 트랙 배정은 대체됩니다.`,
      confirmLabel: '변경',
    })
    if (!confirmed) return
    setBulkBusy(true)
    try {
      const r = await assignTracksToUsers(ids, trackIds)
      toast(`${r.updated}명의 트랙을 변경했습니다.`)
      setSelectedIds(new Set())
      setBulkTrackIds([])
      load()
    } catch (err: unknown) {
      toast(errorMessage(err), 'error')
    } finally {
      setBulkBusy(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">회원 관리</h1>
        <Link
          href="/admin/data"
          className="btn-secondary inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg"
        >
          <Database aria-hidden="true" className="size-4" />
          데이터 정리
        </Link>
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-center text-gray-400 py-12 text-sm">불러오는 중...</p>
      ) : (
        <>
          <section className="mb-10">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
              승인 대기 ({pending.length})
            </h2>
            {pending.length === 0 ? (
              <p className="text-sm text-gray-400">대기 중인 가입 신청이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {pending.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between bg-white dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-gray-800 dark:text-gray-100">
                        {u.name} <span className="text-gray-400 font-normal">· {u.student_id}</span>
                      </p>
                      <p className="text-xs text-gray-400">
                        {u.email} · {u.generation}기
                      </p>
                      <p className="text-xs text-gray-400">
                        플랜 {u.plan?.name ?? '미선택'} · 과정{' '}
                        {u.tracks && u.tracks.length > 0
                          ? u.tracks.map((t) => t.name).join(', ')
                          : '미선택'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => approve(u.id)}
                        className="text-sm btn-primary px-3 py-1.5 rounded-lg font-medium transition"
                      >
                        승인
                      </button>
                      <button
                        onClick={() => remove(u)}
                        className="text-sm text-gray-400 hover:text-red-500 px-3 py-1.5 transition"
                      >
                        거절
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mb-10">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                전체 회원 ({approved.length}
                {approved.length !== users.filter((u) => u.is_active).length &&
                  ` / ${users.filter((u) => u.is_active).length}`}
                )
              </h2>
              <button
                onClick={toggleSelectAll}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
              >
                {approved.length > 0 && approved.every((u) => selectedIds.has(u.id))
                  ? '전체 해제'
                  : '보이는 전체 선택'}
              </button>
            </div>

            {/* 찾기 도구 — 이름으로 검색하거나 미배정만 걸러내면, 배정할 사람을
                가입순 목록에서 눈으로 찾을 필요가 없다. */}
            <div className="flex flex-wrap gap-2 mb-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="이름 · 학번 · 이메일 검색"
                className="flex-1 min-w-[180px] field"
              />
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                aria-label="정렬 기준"
                className="field"
              >
                {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
                  <option key={k} value={k}>
                    {SORT_LABEL[k]}
                  </option>
                ))}
              </select>
              <select
                value={unassigned}
                onChange={(e) => setUnassigned(e.target.value as UnassignedFilter)}
                aria-label="배정 상태 필터"
                className="field"
              >
                {(Object.keys(UNASSIGNED_LABEL) as UnassignedFilter[]).map((k) => (
                  <option key={k} value={k}>
                    {UNASSIGNED_LABEL[k]}
                  </option>
                ))}
              </select>
            </div>

            {/* 일괄 배정 — 선택한 사람이 있을 때만 나타난다. */}
            {visibleSelectedIds.length > 0 && (
              <div className="panel rounded-xl px-4 py-3 mb-3 flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {visibleSelectedIds.length}명 선택됨
                </span>
                <select
                  value=""
                  disabled={bulkBusy}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v === '') return
                    bulkPlan(v === 'NONE' ? null : Number(v))
                    e.target.value = ''
                  }}
                  aria-label="선택한 회원 플랜 일괄 배정"
                  className="field"
                >
                  <option value="">플랜 일괄 배정...</option>
                  {plans.map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.name}
                    </option>
                  ))}
                  <option value="NONE">배정 해제</option>
                </select>
                <TrackMultiSelect
                  tracks={tracks}
                  selected={bulkTrackIds}
                  onChange={setBulkTrackIds}
                  disabled={bulkBusy}
                />
                <button
                  onClick={() => bulkTracks(bulkTrackIds)}
                  disabled={bulkBusy}
                  className="btn-secondary text-sm px-3 py-1.5 rounded-lg disabled:opacity-50"
                >
                  트랙 적용
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition ml-auto"
                >
                  선택 해제
                </button>
              </div>
            )}

            {approved.length === 0 ? (
              <p className="text-sm text-gray-400">조건에 맞는 회원이 없습니다.</p>
            ) : (
            <div className="space-y-2">
              {approved.map((u) => (
                <div
                  key={u.id}
                  className={`flex items-center justify-between bg-white dark:bg-[#0f0f0f] border rounded-xl px-4 py-3 transition ${
                    selectedIds.has(u.id)
                      ? 'border-gray-900 dark:border-white'
                      : 'border-gray-200 dark:border-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(u.id)}
                      onChange={() => toggleSelected(u.id)}
                      aria-label={`${u.name} 선택`}
                      className="size-4 shrink-0 accent-gray-900 dark:accent-white"
                    />
                    <div className="min-w-0">
                    <p className="font-medium text-gray-800 dark:text-gray-100">
                      {u.name} <span className="text-gray-400 font-normal">· {u.student_id}</span>
                      {u.role !== 'MEMBER' && (
                        <span className="ml-2 text-xs badge-neutral px-2 py-0.5 rounded-full font-medium">
                          {ROLE_LABEL[u.role]}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400">
                      {u.email} · {u.generation}기
                    </p>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center flex-wrap justify-end">
                    <PenaltyStepper
                      label="주의"
                      value={u.caution_count ?? 0}
                      onChange={(v) => changePenalty(u, v, u.warning_count ?? 0)}
                    />
                    <PenaltyStepper
                      label="경고"
                      value={u.warning_count ?? 0}
                      onChange={(v) => changePenalty(u, u.caution_count ?? 0, v)}
                    />
                    <select
                      value={u.plan?.id ?? ''}
                      onChange={(e) => changePlan(u, e.target.value)}
                      aria-label={`${u.name} 플랜`}
                      className="w-36 text-sm bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-400"
                    >
                      <option value="">플랜 미배정</option>
                      {plans.map((pl) => (
                        <option key={pl.id} value={pl.id}>
                          {pl.name}
                        </option>
                      ))}
                    </select>
                    <TrackMultiSelect
                      tracks={tracks}
                      selected={(u.tracks ?? []).map((t) => t.id)}
                      onChange={(ids) => changeTracks(u, ids)}
                    />
                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u, e.target.value as User['role'])}
                      disabled={u.id === me.id}
                      aria-label={`${u.name} 역할`}
                      className="text-sm bg-transparent border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 rounded-lg px-2 py-1.5 transition disabled:opacity-30"
                    >
                      {(['MEMBER', 'MENTOR', 'ADMIN'] as const).map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => resetPassword(u)}
                      className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white px-3 py-1.5 transition"
                    >
                      비밀번호 초기화
                    </button>
                    <button
                      onClick={() => sendUserNotification(u)}
                      className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white px-3 py-1.5 transition"
                    >
                      알림 보내기
                    </button>
                    <button
                      onClick={() => remove(u)}
                      disabled={u.id === me.id}
                      className="text-sm text-gray-400 hover:text-red-500 px-3 py-1.5 transition disabled:opacity-30"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
            )}
          </section>

          <KeyedListSection
            title="게시판 관리"
            className=""
            items={boards}
            keyPlaceholder="키 (예: STUDY)"
            namePlaceholder="이름 (예: 스터디)"
            onAdd={addBoard}
            onRename={renameBoard}
            onDelete={removeBoard}
            renderBadge={(b) =>
              b.admin_only && (
                <span className="ml-2 text-xs badge-neutral px-2 py-0.5 rounded-full font-medium">
                  관리자 전용 작성
                </span>
              )
            }
            renderExtraAction={(b) => (
              <button
                onClick={() => toggleAdminOnly(b)}
                className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white px-3 py-1.5 transition"
              >
                {b.admin_only ? '전체 작성 허용' : '관리자 전용으로'}
              </button>
            )}
          />

          <KeyedListSection
            title="트랙 관리"
            items={tracks}
            keyPlaceholder="키 (예: REVERSING)"
            namePlaceholder="이름 (예: 리버싱)"
            onAdd={addTrack}
            onRename={renameTrack}
            onDelete={removeTrack}
          />

          <KeyedListSection
            title="플랜 관리"
            items={plans}
            keyPlaceholder="키 (예: CHALLENGER)"
            namePlaceholder="이름 (예: Challenger's Plan)"
            emptyText="등록된 플랜이 없습니다."
            onAdd={addPlan}
            onRename={renamePlan}
            onDelete={removePlan}
          />
        </>
      )}
    </div>
  )
}
