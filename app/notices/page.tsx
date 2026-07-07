'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, getStoredUser } from '@/lib/api'
import type { Post, User } from '@/lib/types'

export default function NoticesPage() {
  const router = useRouter()
  const user = getStoredUser<User>()
  const [notices, setNotices] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get<Post[]>('/api/posts?board_type=NOTICE')
      .then(setNotices)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">공지사항</h1>
        {user?.role === 'ADMIN' && (
          <button
            onClick={() => router.push('/notices/new')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            + 공지 작성
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-12 text-sm">불러오는 중...</p>
      ) : notices.length === 0 ? (
        <p className="text-center text-gray-400 py-12 text-sm">등록된 공지사항이 없습니다.</p>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-800/60 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-xl overflow-hidden">
          {notices.map((n) => (
            <div
              key={n.id}
              onClick={() => router.push(`/notices/${n.id}`)}
              className="px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#222] transition"
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-800 dark:text-gray-100">{n.title}</p>
                <span className="text-xs text-gray-400 shrink-0">
                  {new Date(n.created_at).toLocaleDateString('ko')}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">{n.author.name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
