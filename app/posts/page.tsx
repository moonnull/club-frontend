'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { listBoards } from '@/lib/api/boards'
import { listPosts } from '@/lib/api/posts'
import { getStoredUser } from '@/lib/session'
import { boardColor } from '@/lib/boardColor'
import { realtimeHub } from '@/lib/ws'
import { toDate } from '@/lib/formatDeadline'
import GradientBackground from '@/components/GradientBackground'
import InitialsAvatar from '@/components/InitialsAvatar'
import type { BoardCategory, Post, User } from '@/lib/types'

const PAGE_SIZE = 20

export default function PostsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const boardType = searchParams.get('board_type') ?? ''
  function setBoardType(key: string) {
    router.replace(key ? `/posts?board_type=${key}` : '/posts')
  }
  const [posts, setPosts] = useState<Post[]>([])
  const [boards, setBoards] = useState<BoardCategory[]>([])
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const user = getStoredUser<User>()
  const boardMap = Object.fromEntries(boards.map((b) => [b.key, b.name]))

  useEffect(() => {
    listBoards().then((all) => setBoards(all.filter((b) => b.key !== 'NOTICE')))
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(0)
  }, [boardType, debouncedSearch])

  useEffect(() => {
    setLoading(true)
    listPosts({
      board_type: boardType || undefined,
      search: debouncedSearch || undefined,
      limit: PAGE_SIZE,
      skip: page * PAGE_SIZE,
    })
      .then((all) => setPosts(all.filter((post) => post.board_type !== 'NOTICE')))
      .finally(() => setLoading(false))
  }, [boardType, debouncedSearch, page])

  useEffect(() => {
    const offCreated = realtimeHub.on('post_created', (data) => {
      if (data.board_type === 'NOTICE') return
      if (page !== 0 || debouncedSearch) return
      if (boardType && data.board_type !== boardType) return
      setPosts((prev) => [data.post, ...prev])
    })
    const offDeleted = realtimeHub.on('post_deleted', (data) => {
      if (data.board_type === 'NOTICE') return
      setPosts((prev) => prev.filter((p) => p.id !== data.post_id))
    })
    return () => {
      offCreated()
      offDeleted()
    }
  }, [boardType, debouncedSearch, page])

  return (
    <div className="relative max-w-3xl mx-auto px-4 py-10">
      <GradientBackground />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">게시판</h1>
        {user && (
          <Link
            href="/posts/new"
            className="gradient-btn text-sm font-medium px-4 py-2 rounded-lg shrink-0"
          >
            + 글쓰기
          </Link>
        )}
      </div>

      {/* 카테고리 필터 pill */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        <button
          onClick={() => setBoardType('')}
          className={`shrink-0 text-sm px-4 py-1.5 rounded-full transition ${
            boardType === ''
              ? 'gradient-btn font-medium'
              : 'border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          전체
        </button>
        {boards.map((b) => (
          <button
            key={b.key}
            onClick={() => setBoardType(b.key)}
            className={`shrink-0 text-sm px-4 py-1.5 rounded-full transition ${
              boardType === b.key
                ? 'gradient-btn font-medium'
                : 'border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {b.name}
          </button>
        ))}
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="검색..."
        className="w-full sm:w-64 bg-gray-100 dark:bg-gray-800 border-0 text-sm text-gray-700 dark:text-gray-300 rounded-lg px-3 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400 dark:placeholder-gray-600"
      />

      {/* 목록 */}
      {loading ? (
        <div className="flex items-center justify-center h-32 text-sm text-gray-400">
          불러오는 중...
        </div>
      ) : posts.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-sm text-gray-400">
          게시글이 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <Link
              key={p.id}
              href={`/posts/${p.id}`}
              className="group flex gap-4 p-4 glass-panel rounded-2xl hover:shadow-xl hover:shadow-purple-500/10 hover:border-purple-300/60 dark:hover:border-purple-400/30 transition"
            >
              <InitialsAvatar name={p.author.name} size={40} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-gray-800 dark:text-gray-100 group-hover:gradient-text transition truncate">
                    {p.title}
                  </h2>
                  {p.is_closed && (
                    <span className="text-xs text-gray-400 shrink-0">[채택완료]</span>
                  )}
                </div>
                {p.excerpt && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                    {p.excerpt}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 mt-2">
                  <span
                    className={`px-2 py-0.5 rounded-full font-medium ${boardColor(p.board_type).badge}`}
                  >
                    {boardMap[p.board_type] ?? p.board_type}
                  </span>
                  <span>{p.author.name}</span>
                  <span>·</span>
                  <span>
                    {toDate(p.created_at).toLocaleDateString('ko', {
                      year: '2-digit',
                      month: '2-digit',
                      day: '2-digit',
                    })}
                  </span>
                  {(p.comment_count ?? 0) > 0 && (
                    <span className="text-indigo-500 dark:text-indigo-400">
                      💬 {p.comment_count}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 페이지네이션 */}
      {!loading && (posts.length > 0 || page > 0) && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="text-sm border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 rounded-lg px-3 py-1.5 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            이전
          </button>
          <span className="text-sm text-gray-400">{page + 1}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={posts.length < PAGE_SIZE}
            className="text-sm border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 rounded-lg px-3 py-1.5 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            다음
          </button>
        </div>
      )}
    </div>
  )
}
