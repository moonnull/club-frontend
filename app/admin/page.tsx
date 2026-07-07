'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, getStoredUser } from '@/lib/api'
import type { User } from '@/lib/types'

export default function AdminPage() {
  const router = useRouter()
  const me = getStoredUser<User>()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!me) return
    if (me.role !== 'ADMIN') {
      router.replace('/')
      return
    }
    load()
  }, [])

  function load() {
    setLoading(true)
    api
      .get<User[]>('/api/admin/users')
      .then(setUsers)
      .catch((err) => setError(err instanceof Error ? err.message : '오류가 발생했습니다.'))
      .finally(() => setLoading(false))
  }

  async function approve(userId: number) {
    try {
      await api.post(`/api/admin/users/${userId}/approve`, {})
      load()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.')
    }
  }

  async function toggleRole(user: User) {
    const nextRole = user.role === 'ADMIN' ? 'MEMBER' : 'ADMIN'
    if (!confirm(`${user.name} 님을 ${nextRole === 'ADMIN' ? '관리자로' : '일반 회원으로'} 변경할까요?`)) return
    try {
      await api.put(`/api/admin/users/${user.id}/role`, { role: nextRole })
      load()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.')
    }
  }

  async function remove(user: User) {
    if (!confirm(`${user.name} 님을 삭제할까요? 이 작업은 되돌릴 수 없습니다.`)) return
    try {
      await api.del(`/api/admin/users/${user.id}`)
      load()
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

          <section>
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
        </>
      )}
    </div>
  )
}
