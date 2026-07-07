'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, getStoredUser } from '@/lib/api'
import { formatDeadline, isPastDeadline } from '@/lib/formatDeadline'
import type { AssignmentListItem, User } from '@/lib/types'

export default function AssignmentsPage() {
  const router = useRouter()
  const user = getStoredUser<User>()
  const [assignments, setAssignments] = useState<AssignmentListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get<AssignmentListItem[]>('/api/assignments')
      .then(setAssignments)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">과제</h1>
        {user?.role === 'ADMIN' && (
          <button
            onClick={() => router.push('/assignments/new')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            + 과제 등록
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-12 text-sm">불러오는 중...</p>
      ) : assignments.length === 0 ? (
        <p className="text-center text-gray-400 py-12 text-sm">등록된 과제가 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => {
            const closed = isPastDeadline(a.end_at)
            return (
              <div
                key={a.id}
                onClick={() => router.push(`/assignments/${a.id}`)}
                className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-xl p-5 cursor-pointer hover:border-indigo-200 dark:hover:border-indigo-500/30 hover:shadow-md transition"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-800 dark:text-gray-100">{a.title}</p>
                  {closed && (
                    <span className="text-xs text-gray-400 shrink-0">마감</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-2">제출 기한 {formatDeadline(a.start_at, a.end_at)}</p>
                <p className="text-xs text-gray-400 mt-1">{a.author.name}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
