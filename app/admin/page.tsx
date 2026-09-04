'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  approveUser,
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
import type { BoardCategory, Plan, Track, User } from '@/lib/types'
import { errorMessage, useToast } from '@/components/Toast'
import { useConfirm } from '@/components/ConfirmDialog'
import TrackMultiSelect from '@/components/TrackMultiSelect'
import PenaltyStepper from '@/components/PenaltyStepper'

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
  const [boardError, setBoardError] = useState('')
  const [trackError, setTrackError] = useState('')
  const [planError, setPlanError] = useState('')
  const [newBoard, setNewBoard] = useState({ key: '', name: '', admin_only: false })
  const [newTrack, setNewTrack] = useState({ key: '', name: '' })
  const [newPlan, setNewPlan] = useState({ key: '', name: '' })

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
      .catch((err) => setError(err instanceof Error ? err.message : '오류가 발생했습니다.'))
      .finally(() => setLoading(false))
  }

  function loadBoards() {
    listBoards().then(setBoards)
  }

  function loadTracks() {
    listTracks().then(setTracks)
  }

  async function approve(userId: number) {
    try {
      await approveUser(userId)
      load()
    } catch (err: unknown) {
      toast(errorMessage(err), 'error')
    }
  }

  async function toggleRole(user: User) {
    const nextRole = user.role === 'ADMIN' ? 'MEMBER' : 'ADMIN'
    const confirmed = await confirm({
      message: `${user.name} 님을 ${nextRole === 'ADMIN' ? '관리자로' : '일반 회원으로'} 변경할까요?`,
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

  async function addBoard(e: React.FormEvent) {
    e.preventDefault()
    setBoardError('')
    try {
      await createBoard(newBoard)
      setNewBoard({ key: '', name: '', admin_only: false })
      loadBoards()
    } catch (err: unknown) {
      setBoardError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    }
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

  async function addTrack(e: React.FormEvent) {
    e.preventDefault()
    setTrackError('')
    try {
      await createTrack(newTrack)
      setNewTrack({ key: '', name: '' })
      loadTracks()
    } catch (err: unknown) {
      setTrackError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    }
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
    listPlans().then(setPlans).catch(() => {})
  }

  async function addPlan(e: React.FormEvent) {
    e.preventDefault()
    setPlanError('')
    try {
      await createPlan(newPlan)
      setNewPlan({ key: '', name: '' })
      loadPlans()
    } catch (err: unknown) {
      setPlanError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    }
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
  const approved = users.filter((u) => u.is_active)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">회원 관리</h1>

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
                        {u.email} · {u.generation}기 · {u.part}
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
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
              전체 회원 ({approved.length})
            </h2>
            <div className="space-y-2">
              {approved.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between bg-white dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-gray-800 dark:text-gray-100">
                      {u.name} <span className="text-gray-400 font-normal">· {u.student_id}</span>
                      {u.role === 'ADMIN' && (
                        <span className="ml-2 text-xs badge-neutral px-2 py-0.5 rounded-full font-medium">
                          관리자
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400">
                      {u.email} · {u.generation}기 · {u.part}
                    </p>
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
                    <button
                      onClick={() => toggleRole(u)}
                      disabled={u.id === me.id}
                      className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white px-3 py-1.5 transition disabled:opacity-30"
                    >
                      {u.role === 'ADMIN' ? '관리자 해제' : '관리자 지정'}
                    </button>
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
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
              게시판 관리 ({boards.length})
            </h2>
            <div className="space-y-2 mb-4">
              {boards.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between bg-white dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-gray-800 dark:text-gray-100">
                      {b.name} <span className="text-gray-400 font-normal">· {b.key}</span>
                      {b.admin_only && (
                        <span className="ml-2 text-xs badge-neutral px-2 py-0.5 rounded-full font-medium">
                          관리자 전용 작성
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => renameBoard(b)}
                      className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white px-3 py-1.5 transition"
                    >
                      이름 수정
                    </button>
                    <button
                      onClick={() => toggleAdminOnly(b)}
                      className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white px-3 py-1.5 transition"
                    >
                      {b.admin_only ? '전체 작성 허용' : '관리자 전용으로'}
                    </button>
                    <button
                      onClick={() => removeBoard(b)}
                      className="text-sm text-gray-400 hover:text-red-500 px-3 py-1.5 transition"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <form
              onSubmit={addBoard}
              className="flex flex-wrap items-center gap-2 bg-white dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3"
            >
              <input
                value={newBoard.key}
                onChange={(e) => setNewBoard((b) => ({ ...b, key: e.target.value.toUpperCase() }))}
                placeholder="키 (예: STUDY)"
                required
                className="bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 rounded-lg px-3 py-1.5 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
              <input
                value={newBoard.name}
                onChange={(e) => setNewBoard((b) => ({ ...b, name: e.target.value }))}
                placeholder="이름 (예: 스터디)"
                required
                className="bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 rounded-lg px-3 py-1.5 text-sm flex-1 min-w-[140px] focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
              <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 select-none">
                <input
                  type="checkbox"
                  checked={newBoard.admin_only}
                  onChange={(e) => setNewBoard((b) => ({ ...b, admin_only: e.target.checked }))}
                  className="rounded"
                />
                관리자만 작성
              </label>
              <button
                type="submit"
                className="text-sm btn-primary px-3 py-1.5 rounded-lg font-medium transition"
              >
                추가
              </button>
              {boardError && <p className="w-full text-red-500 text-xs">{boardError}</p>}
            </form>
          </section>

          <section className="mt-10">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
              트랙 관리 ({tracks.length})
            </h2>
            <div className="space-y-2 mb-4">
              {tracks.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between bg-white dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-gray-800 dark:text-gray-100">
                      {t.name} <span className="text-gray-400 font-normal">· {t.key}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => renameTrack(t)}
                      className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white px-3 py-1.5 transition"
                    >
                      이름 수정
                    </button>
                    <button
                      onClick={() => removeTrack(t)}
                      className="text-sm text-gray-400 hover:text-red-500 px-3 py-1.5 transition"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <form
              onSubmit={addTrack}
              className="flex flex-wrap items-center gap-2 bg-white dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3"
            >
              <input
                value={newTrack.key}
                onChange={(e) => setNewTrack((t) => ({ ...t, key: e.target.value.toUpperCase() }))}
                placeholder="키 (예: REVERSING)"
                required
                className="bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 rounded-lg px-3 py-1.5 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
              <input
                value={newTrack.name}
                onChange={(e) => setNewTrack((t) => ({ ...t, name: e.target.value }))}
                placeholder="이름 (예: 리버싱)"
                required
                className="bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 rounded-lg px-3 py-1.5 text-sm flex-1 min-w-[140px] focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
              <button
                type="submit"
                className="text-sm btn-primary px-3 py-1.5 rounded-lg font-medium transition"
              >
                추가
              </button>
              {trackError && <p className="w-full text-red-500 text-xs">{trackError}</p>}
            </form>
          </section>

          <section className="mt-10">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
              플랜 관리 ({plans.length})
            </h2>
            <div className="space-y-2 mb-4">
              {plans.map((pl) => (
                <div
                  key={pl.id}
                  className="flex items-center justify-between bg-white dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3"
                >
                  <p className="font-medium text-gray-800 dark:text-gray-100">
                    {pl.name} <span className="text-gray-400 font-normal">· {pl.key}</span>
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => renamePlan(pl)}
                      className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white px-3 py-1.5 transition"
                    >
                      이름 수정
                    </button>
                    <button
                      onClick={() => removePlan(pl)}
                      className="text-sm text-gray-400 hover:text-red-500 px-3 py-1.5 transition"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
              {plans.length === 0 && (
                <p className="text-sm text-gray-400">등록된 플랜이 없습니다.</p>
              )}
            </div>

            <form
              onSubmit={addPlan}
              className="flex flex-wrap items-center gap-2 bg-white dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3"
            >
              <input
                value={newPlan.key}
                onChange={(e) => setNewPlan((pl) => ({ ...pl, key: e.target.value.toUpperCase() }))}
                placeholder="키 (예: CHALLENGER)"
                required
                className="bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 rounded-lg px-3 py-1.5 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
              <input
                value={newPlan.name}
                onChange={(e) => setNewPlan((pl) => ({ ...pl, name: e.target.value }))}
                placeholder="이름 (예: Challenger's Plan)"
                required
                className="bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 rounded-lg px-3 py-1.5 text-sm flex-1 min-w-[140px] focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
              <button
                type="submit"
                className="text-sm btn-primary px-3 py-1.5 rounded-lg font-medium transition"
              >
                추가
              </button>
              {planError && <p className="w-full text-red-500 text-xs">{planError}</p>}
            </form>
          </section>
        </>
      )}
    </div>
  )
}
