'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { api, getStoredUser } from '@/lib/api'
import type { Post, User } from '@/lib/types'

const BOARDS = [
  { key: '', label: '전체' },
  { key: 'NOTICE', label: '공지' },
  { key: 'FREE', label: '자유' },
  { key: 'QNA', label: 'Q&A' },
  { key: 'RECRUIT', label: '모집' },
]

const BOARD_BADGE: Record<string, string> = {
  NOTICE: 'bg-red-100 text-red-600',
  FREE: 'bg-blue-100 text-blue-600',
  QNA: 'bg-green-100 text-green-600',
  RECRUIT: 'bg-purple-100 text-purple-600',
}
const BOARD_LABEL: Record<string, string> = {
  NOTICE: '공지',
  FREE: '자유',
  QNA: 'Q&A',
  RECRUIT: '모집',
}

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [boardType, setBoardType] = useState('')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const user = getStoredUser<User>()

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (boardType) params.set('board_type', boardType)
    if (query) params.set('search', query)
    api
      .get<Post[]>(`/api/posts?${params}`)
      .then(setPosts)
      .finally(() => setLoading(false))
  }, [boardType, query])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">게시판</h1>
        {user && (
          <Link
            href="/posts/new"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            글쓰기
          </Link>
        )}
      </div>

      {/* 탭 */}
      <div className="flex gap-1 mb-4">
        {BOARDS.map((b) => (
          <button
            key={b.key}
            onClick={() => setBoardType(b.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              boardType === b.key
                ? 'bg-indigo-600 text-white'
                : 'bg-white border hover:bg-gray-50'
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* 검색 */}
      <div className="flex gap-2 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && setQuery(search)}
          placeholder="제목 또는 내용 검색..."
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button
          onClick={() => setQuery(search)}
          className="bg-gray-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-800 transition"
        >
          검색
        </button>
      </div>

      {/* 목록 */}
      {loading ? (
        <p className="text-gray-400 text-center py-12">불러오는 중...</p>
      ) : posts.length === 0 ? (
        <p className="text-gray-400 text-center py-12">게시글이 없습니다.</p>
      ) : (
        <div className="bg-white rounded-xl border divide-y">
          {posts.map((p) => (
            <Link
              key={p.id}
              href={`/posts/${p.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition"
            >
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${BOARD_BADGE[p.board_type]}`}
              >
                {BOARD_LABEL[p.board_type]}
              </span>
              <span className="flex-1 text-sm font-medium text-gray-800 truncate">
                {p.title}
                {p.is_closed && (
                  <span className="ml-1 text-xs text-gray-400">[채택완료]</span>
                )}
              </span>
              <span className="text-xs text-gray-400 shrink-0">
                {p.author.name}
              </span>
              <span className="text-xs text-gray-300 shrink-0">
                조회 {p.view_count} · 댓글 {p.comment_count ?? 0}
              </span>
              <span className="text-xs text-gray-300 shrink-0">
                {new Date(p.created_at).toLocaleDateString('ko')}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
