'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { approveUser, deleteUser, listUsers, updateUserRole } from '@/lib/api/admin'
import { createBoard, deleteBoard, listBoards, updateBoard } from '@/lib/api/boards'
import { getStoredUser } from '@/lib/session'
import type { BoardCategory, User } from '@/lib/types'

export default function AdminPage() {
  const router = useRouter()
  const me = getStoredUser<User>()
  const [users, setUsers] = useState<User[]>([])
  const [boards, setBoards] = useState<BoardCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [boardError, setBoardError] = useState('')
  const [newBoard, setNewBoard] = useState({ key: '', name: '', admin_only: false })

  useEffect(() => {
    if (!me) return
    if (me.role !== 'ADMIN') {
      router.replace('/')
      return
    }
    load()
    loadBoards()
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

  async function approve(userId: number) {
    try {
      await approveUser(userId)
      load()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.')
    }
  }

  async function toggleRole(user: User) {
    const nextRole = user.role === 'ADMIN' ? 'MEMBER' : 'ADMIN'
    if (!confirm(`${user.name} 님을 ${nextRole === 'ADMIN' ? '관리자로' : '일반 회원으로'} 변경할까요?`)) return
    try {
      await updateUserRole(user.id, nextRole)
      load()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.')
    }
  }

  async function remove(user: User) {
    if (!confirm(`${user.name} 님을 삭제할까요? 이 작업은 되돌릴 수 없습니다.`)) return
    try {
      await deleteUser(user.id)
      load()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.')
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
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.')
    }
  }

  async function toggleAdminOnly(board: BoardCategory) {
    try {
      await updateBoard(board.id, { admin_only: !board.admin_only })
      loadBoards()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.')
    }
  }

  async function removeBoard(board: BoardCategory) {
    if (!confirm(`'${board.name}' 게시판을 삭제할까요?`)) return
    try {
      await deleteBoard(board.id)
      loadBoards()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.')
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
                    className="flex items-center justify-between bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-xl px-4 py-3"
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
                        className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-medium transition"
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
                  className="flex items-center justify-between bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-xl px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-gray-800 dark:text-gray-100">
                      {u.name} <span className="text-gray-400 font-normal">· {u.student_id}</span>
                      {u.role === 'ADMIN' && (
                        <span className="ml-2 text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-medium">
                          관리자
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400">
                      {u.email} · {u.generation}기 · {u.part}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleRole(u)}
                      disabled={u.id === me.id}
                      className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white px-3 py-1.5 transition disabled:opacity-30"
                    >
                      {u.role === 'ADMIN' ? '관리자 해제' : '관리자 지정'}
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
                  className="flex items-center justify-between bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-xl px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-gray-800 dark:text-gray-100">
                      {b.name} <span className="text-gray-400 font-normal">· {b.key}</span>
                      {b.admin_only && (
                        <span className="ml-2 text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-medium">
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
              className="flex flex-wrap items-center gap-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-xl px-4 py-3"
            >
              <input
                value={newBoard.key}
                onChange={(e) => setNewBoard((b) => ({ ...b, key: e.target.value.toUpperCase() }))}
                placeholder="키 (예: STUDY)"
                required
                className="bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 rounded-lg px-3 py-1.5 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <input
                value={newBoard.name}
                onChange={(e) => setNewBoard((b) => ({ ...b, name: e.target.value }))}
                placeholder="이름 (예: 스터디)"
                required
                className="bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 rounded-lg px-3 py-1.5 text-sm flex-1 min-w-[140px] focus:outline-none focus:ring-2 focus:ring-indigo-400"
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
                className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-medium transition"
              >
                추가
              </button>
              {boardError && <p className="w-full text-red-500 text-xs">{boardError}</p>}
            </form>
          </section>
        </>
      )}
    </div>
  )
}
