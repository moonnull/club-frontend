'use client'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { api, getStoredUser } from '@/lib/api'
import PostContent from '@/components/PostContent'
import type { BoardCategory, Comment, Post, User } from '@/lib/types'

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [post, setPost] = useState<Post | null>(null)
  const [sidebarPosts, setSidebarPosts] = useState<Post[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [boardMap, setBoardMap] = useState<Record<string, string>>({})
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const user = getStoredUser<User>()

  async function load() {
    setLoading(true)
    setPost(null)
    setComments([])
    setSidebarPosts([])
    try {
      const [p, c] = await Promise.all([
        api.get<Post>(`/api/posts/${id}`),
        api.get<Comment[]>(`/api/posts/${id}/comments`),
      ])
      setPost(p)
      setComments(c)
      const side = await api.get<Post[]>(
        `/api/posts?board_type=${p.board_type}&limit=30`
      )
      setSidebarPosts(side)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])
  useEffect(() => {
    api.get<BoardCategory[]>('/api/boards').then((boards) =>
      setBoardMap(Object.fromEntries(boards.map((b) => [b.key, b.name])))
    )
  }, [])

  async function handleDelete() {
    if (!confirm('게시글을 삭제하시겠습니까?')) return
    await api.del(`/api/posts/${id}`)
    router.push('/posts')
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    const c = await api.post<Comment>(`/api/posts/${id}/comments`, { content: text })
    setComments((prev) => [...prev, c])
    setText('')
  }

  async function deleteComment(cid: number) {
    await api.del(`/api/comments/${cid}`)
    setComments((prev) => prev.filter((c) => c.id !== cid))
  }

  async function adoptComment(cid: number) {
    const updated = await api.post<Comment>(`/api/posts/${id}/adopt/${cid}`, {})
    setComments((prev) =>
      prev.map((c) => (c.id === cid ? updated : { ...c, is_adopted: false }))
    )
    setPost((p) => (p ? { ...p, is_closed: true } : p))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)] text-sm text-gray-400">
        불러오는 중...
      </div>
    )
  }
  if (!post) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)] text-sm text-gray-400">
        게시글을 찾을 수 없습니다.
      </div>
    )
  }

  const canManage = user && (user.id === post.author.id || user.role === 'ADMIN')
  const isAuthor = user?.id === post.author.id
  const boardLabel = boardMap[post.board_type] ?? post.board_type

  return (
    <div className="flex h-[calc(100vh-56px)]">
      {/* ── 왼쪽 사이드바: 같은 게시판 목록 ── */}
      <aside className="w-56 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111] flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <Link
            href="/posts"
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition mb-2"
          >
            ← 목록으로
          </Link>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            {boardLabel} 게시판
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto py-1">
          {sidebarPosts.map((p) => (
            <Link
              key={p.id}
              href={`/posts/${p.id}`}
              className={`block px-4 py-2.5 border-l-2 transition ${
                p.id === post.id
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10'
                  : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/40'
              }`}
            >
              <p
                className={`text-sm truncate leading-snug ${
                  p.id === post.id
                    ? 'font-medium text-indigo-700 dark:text-indigo-300'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                {p.title}
              </p>
              <p className="text-[11px] text-gray-400 dark:text-gray-600 mt-0.5">
                {new Date(p.created_at).toLocaleDateString('ko')}
              </p>
            </Link>
          ))}
        </nav>
      </aside>

      {/* ── 가운데: 게시글 본문 ── */}
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#0d0d0d]">
        <div className="max-w-2xl mx-auto px-6 py-8">
          {/* 제목 영역 */}
          <div className="flex items-start gap-3 justify-between mb-2">
            <div className="flex-1">
              <span className="text-xs font-medium text-indigo-500 dark:text-indigo-400">
                {boardLabel}
              </span>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white mt-1 leading-snug">
                {post.title}
              </h1>
            </div>
            {canManage && (
              <div className="flex items-center gap-3 shrink-0 mt-1">
                <button
                  onClick={() => router.push(`/posts/${id}/edit`)}
                  className="text-xs text-gray-400 hover:text-indigo-500 transition"
                >
                  수정
                </button>
                <button
                  onClick={handleDelete}
                  className="text-xs text-gray-400 hover:text-red-500 transition"
                >
                  삭제
                </button>
              </div>
            )}
          </div>

          {/* 메타 */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 dark:text-gray-500 mb-6 mt-2">
            <span className="font-medium text-gray-600 dark:text-gray-300">
              {post.author.name}
            </span>
            <span>·</span>
            <span>{new Date(post.created_at).toLocaleString('ko')}</span>
            <span>·</span>
            <span>조회 {post.view_count}</span>
            {post.is_closed && (
              <>
                <span>·</span>
                <span className="text-green-500 font-medium">✓ 채택 완료</span>
              </>
            )}
          </div>

          {/* 본문 */}
          <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
            <PostContent content={post.content} />
          </div>

          {/* 첨부파일 */}
          {post.attachments && post.attachments.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-800 mt-6 pt-4">
              <p className="text-xs font-semibold text-gray-400 mb-2">첨부파일</p>
              <ul className="space-y-1.5">
                {post.attachments.map((a) => (
                  <li key={a.id}>
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      📎 {a.filename}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* ── 오른쪽 패널: 댓글/제출 ── */}
      <div className="w-80 shrink-0 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111] flex flex-col overflow-hidden">
        {/* 탭 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <div className="flex gap-4">
            <span className="text-sm font-semibold text-gray-900 dark:text-white border-b-2 border-indigo-500 pb-0.5">
              댓글
            </span>
            {post.board_type === 'QNA' && (
              <span className="text-sm text-gray-400">Q&A</span>
            )}
          </div>
          {user && (
            <button
              form="comment-form"
              type="submit"
              className="text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg font-medium transition"
            >
              작성
            </button>
          )}
        </div>

        {/* 댓글 목록 */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/50">
          {comments.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-xs text-gray-400">
              아직 댓글이 없습니다.
            </div>
          ) : (
            comments.map((c) => (
              <div
                key={c.id}
                className={`px-4 py-3.5 ${
                  c.is_adopted ? 'bg-green-50 dark:bg-green-500/5' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    {c.is_adopted && (
                      <span className="text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded font-semibold">
                        채택
                      </span>
                    )}
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {c.author.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {post.board_type === 'QNA' &&
                      isAuthor &&
                      !post.is_closed && (
                        <button
                          onClick={() => adoptComment(c.id)}
                          className="text-xs text-green-600 hover:underline"
                        >
                          채택
                        </button>
                      )}
                    {user &&
                      (user.id === c.author.id ||
                        user.role === 'ADMIN') && (
                        <button
                          onClick={() => deleteComment(c.id)}
                          className="text-xs text-gray-400 hover:text-red-500 transition"
                        >
                          삭제
                        </button>
                      )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
                  {c.content}
                </p>
                <p className="text-[11px] text-gray-400 dark:text-gray-600 mt-1.5">
                  {new Date(c.created_at).toLocaleString('ko')}
                </p>
              </div>
            ))
          )}
        </div>

        {/* 댓글 입력 */}
        <div className="border-t border-gray-200 dark:border-gray-800 p-3 shrink-0">
          {user ? (
            <form id="comment-form" onSubmit={submitComment}>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="'/'를 입력하여 작성을 시작해보세요."
                rows={3}
                className="w-full bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] text-gray-800 dark:text-gray-200 text-sm rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-indigo-500 transition placeholder-gray-400 dark:placeholder-gray-600"
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-400">{text.length}자</span>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-semibold px-4 py-1.5 rounded-lg hover:opacity-80 transition"
                >
                  ✏️ 작성
                </button>
              </div>
            </form>
          ) : (
            <Link
              href="/login"
              className="block text-center text-sm text-indigo-600 dark:text-indigo-400 hover:underline py-2"
            >
              로그인 후 댓글 작성 가능
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
