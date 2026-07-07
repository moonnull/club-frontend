'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { listAssignments } from '@/lib/api/assignments'
import { getStoredUser } from '@/lib/session'
import { isPastDeadline } from '@/lib/formatDeadline'
import type { AssignmentListItem, User } from '@/lib/types'

export default function AssignmentsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const user = getStoredUser<User>()
  const [assignments, setAssignments] = useState<AssignmentListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listAssignments()
      .then(setAssignments)
      .finally(() => setLoading(false))
  }, [pathname])

  const currentId = pathname.match(/^\/assignments\/(\d+)/)?.[1]

  return (
    <div className="flex h-[calc(100vh-56px)]">
      <aside className="w-64 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">과제</p>
          {user?.role === 'ADMIN' && (
            <button
              onClick={() => router.push('/assignments/new')}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded-md font-medium transition"
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
                  <p className="text-[11px] text-gray-400 dark:text-gray-600 mt-0.5">
                    {closed ? '마감' : new Date(a.end_at).toLocaleDateString('ko')}
                  </p>
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
