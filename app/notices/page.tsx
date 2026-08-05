'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { listPosts } from '@/lib/api/posts'
import { getStoredUser } from '@/lib/session'
import { realtimeHub } from '@/lib/ws'
import { toDate } from '@/lib/formatDeadline'
import GradientBackground from '@/components/GradientBackground'
import type { Post, User } from '@/lib/types'

export default function NoticesPage() {
  const router = useRouter()
  const user = getStoredUser<User>()
  const [notices, setNotices] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listPosts({ board_type: 'NOTICE' })
      .then(setNotices)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const offCreated = realtimeHub.on('post_created', (data) => {
      if (data.board_type !== 'NOTICE') return
      setNotices((prev) => [data.post, ...prev])
    })
    const offDeleted = realtimeHub.on('post_deleted', (data) => {
      if (data.board_type !== 'NOTICE') return
      setNotices((prev) => prev.filter((n) => n.id !== data.post_id))
    })
    return () => {
      offCreated()
      offDeleted()
    }
  }, [])

  return (
    <div className="relative max-w-3xl mx-auto px-4 py-8">
      <GradientBackground />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">공지사항</h1>
        {user?.role === 'ADMIN' && (
          <button
            onClick={() => router.push('/notices/new')}
            className="gradient-btn px-4 py-2 rounded-lg text-sm font-medium"
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
        <div className="divide-y divide-gray-100 dark:divide-gray-800/60 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-xl shadow-sm overflow-hidden">
          {notices.map((n) => (
            <div
              key={n.id}
              onClick={() => router.push(`/notices/${n.id}`)}
              className="px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#222] transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-indigo-500/15 text-indigo-500">
                    {n.track ? `${n.track.name} 트랙` : '전체 공지'}
                  </span>
                  <p className="font-medium text-gray-800 dark:text-gray-100 truncate">{n.title}</p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  {toDate(n.created_at).toLocaleDateString('ko')}
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
