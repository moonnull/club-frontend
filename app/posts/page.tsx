'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api, getStoredUser } from '@/lib/api'
import type { BoardCategory, Post, User } from '@/lib/types'

const BOARD_COLORS = [
  { badge: 'bg-blue-500/15 text-blue-400', dot: 'bg-blue-400' },
  { badge: 'bg-green-500/15 text-green-400', dot: 'bg-green-400' },
  { badge: 'bg-purple-500/15 text-purple-400', dot: 'bg-purple-400' },
  { badge: 'bg-amber-500/15 text-amber-400', dot: 'bg-amber-400' },
  { badge: 'bg-pink-500/15 text-pink-400', dot: 'bg-pink-400' },
  { badge: 'bg-cyan-500/15 text-cyan-400', dot: 'bg-cyan-400' },
]

function boardColor(key: string) {
  let hash = 0
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) % BOARD_COLORS.length
  return BOARD_COLORS[hash]
}

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
  const [loading, setLoading] = useState(true)
  const user = getStoredUser<User>()
  const boardMap = Object.fromEntries(boards.map((b) => [b.key, b.name]))

  useEffect(() => {
    api.get<BoardCategory[]>('/api/boards').then(setBoards)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setLoading(true)
    const p = new URLSearchParams()
    if (boardType) p.set('board_type', boardType)
    if (debouncedSearch) p.set('search', debouncedSearch)
    api
      .get<Post[]>(`/api/posts?${p}`)
      .then(setPosts)
      .finally(() => setLoading(false))
  }, [boardType, debouncedSearch])

  return (
    <div className="flex h-[calc(100vh-56px)]">
      {/* ── 왼쪽 사이드바 ── */}
      <aside className="w-56 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111] flex flex-col">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            게시판
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          <button
            onClick={() => setBoardType('')}
            className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${
              boardType === ''
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-medium'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <span className="text-base">📋</span>
            <span>전체 게시글</span>
          </button>
          {boards.map((b) => (
            <button
              key={b.key}
              onClick={() => setBoardType(b.key)}
              className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${
                boardType === b.key
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-medium'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${boardColor(b.key).dot}`} />
              <span>{b.name}</span>
            </button>
          ))}
        </nav>

        {user && (
          <div className="p-3 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={() => router.push('/posts/new')}
              className="w-full flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 rounded-lg transition"
            >
              + 글쓰기
            </button>
          </div>
        )}
      </aside>

      {/* ── 메인 컨텐츠 ── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-[#0d0d0d]">
        {/* 헤더 */}
        <div className="px-6 py-3.5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111] flex items-center gap-3 shrink-0">
          <h1 className="text-sm font-semibold text-gray-900 dark:text-white">
            {boardMap[boardType] ?? '전체 게시글'}
          </h1>
          <div className="flex-1" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="검색..."
            className="bg-gray-100 dark:bg-gray-800 border-0 text-sm text-gray-700 dark:text-gray-300 rounded-lg px-3 py-1.5 w-44 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400 dark:placeholder-gray-600"
          />
        </div>

        {/* 목록 */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">
              불러오는 중...
            </div>
          ) : posts.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">
              게시글이 없습니다.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111]">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 w-16">
                    구분
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">
                    제목
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 w-20">
                    작성자
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-400 w-36">
                    작성 시각
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                {posts.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/posts/${p.id}`)}
                    className="bg-white dark:bg-[#111] hover:bg-gray-50 dark:hover:bg-[#1a1a1a] cursor-pointer transition"
                  >
                    <td className="px-6 py-3.5">
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-medium ${boardColor(p.board_type).badge}`}
                      >
                        {boardMap[p.board_type] ?? p.board_type}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-medium text-gray-800 dark:text-gray-100">
                        {p.title}
                      </span>
                      {p.is_closed && (
                        <span className="ml-2 text-xs text-gray-400">[채택완료]</span>
                      )}
                      {(p.comment_count ?? 0) > 0 && (
                        <span className="ml-2 text-xs text-indigo-500 dark:text-indigo-400">
                          □{p.comment_count}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 dark:text-gray-400">
                      {p.author.name}
                    </td>
                    <td className="px-6 py-3.5 text-right text-xs text-gray-400">
                      {new Date(p.created_at).toLocaleDateString('ko', {
                        year: '2-digit',
                        month: '2-digit',
                        day: '2-digit',
                      })}{' '}
                      {new Date(p.created_at).toLocaleTimeString('ko', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
