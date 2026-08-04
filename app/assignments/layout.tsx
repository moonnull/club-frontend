'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { listAssignments } from '@/lib/api/assignments'
import { getStoredUser } from '@/lib/session'
import { isPastDeadline } from '@/lib/formatDeadline'
import { realtimeHub } from '@/lib/ws'
import type { AssignmentListItem, User } from '@/lib/types'

export default function AssignmentsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const user = getStoredUser<User>()
  const [assignments, setAssignments] = useState<AssignmentListItem[]>([])
  const [loading, setLoading] = useState(true)
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

  return (
    <div className="flex h-[calc(100vh-56px)]">
      <aside className="w-64 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">과제</p>
          {user?.role === 'ADMIN' && (
            <button
              onClick={() => router.push('/assignments/new')}
              className="text-xs gradient-btn px-2.5 py-1 rounded-md font-medium"
            >
              + 등록
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-1">
          {loading ? (
            <p className="text-xs text-gray-400 px-4 py-3">불러오는 중...</p>
          ) : assignments.length === 0 ? (
            <p className="text-xs text-gray-400 px-4 py-3">등록된 과제가 없습니다.</p>
          ) : (
            assignments.map((a) => {
              const active = String(a.id) === currentId
              const closed = isPastDeadline(a.end_at)
              return (
                <Link
                  key={a.id}
                  href={`/assignments/${a.id}`}
                  className={`block px-4 py-2.5 border-l-2 transition ${
                    active
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10'
                      : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/40'
                  }`}
                >
                  <p
                    className={`text-sm truncate leading-snug ${
                      active
                        ? 'font-medium text-indigo-700 dark:text-indigo-300'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {a.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {a.track && (
                      <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-indigo-500/15 text-indigo-500">
                        {a.track.name}
                      </span>
                    )}
                    <p className="text-[11px] text-gray-400 dark:text-gray-600">
                      {closed ? '마감' : new Date(a.end_at).toLocaleDateString('ko')}
                    </p>
                  </div>
                </Link>
              )
            })
          )}
        </nav>
      </aside>

      <div className="flex-1 min-w-0 overflow-y-auto">{children}</div>
    </div>
  )
}
