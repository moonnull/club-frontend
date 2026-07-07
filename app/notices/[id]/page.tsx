'use client'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { api, getStoredUser } from '@/lib/api'
import PostContent from '@/components/PostContent'
import type { Comment, Post, User } from '@/lib/types'

export default function NoticeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const user = getStoredUser<User>()
  const [notice, setNotice] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    setLoading(true)
    setNotice(null)
    setComments([])
    setNotFound(false)
    Promise.all([
      api.get<Post>(`/api/posts/${id}`),
      api.get<Comment[]>(`/api/posts/${id}/comments`),
    ])
      .then(([p, c]) => {
        setNotice(p)
        setComments(c)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  async function handleDelete() {
    if (!confirm('공지사항을 삭제하시겠습니까?')) return
    await api.del(`/api/posts/${id}`)
    router.push('/notices')
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)] text-sm text-gray-400">
        불러오는 중...
      </div>
    )
  }
  if (notFound || !notice) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)] text-sm text-gray-400">
        공지사항을 찾을 수 없습니다.
      </div>
    )
  }

  const canManage = user && (user.id === notice.author.id || user.role === 'ADMIN')

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link
        href="/notices"
        className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition mb-4"
      >
        ← 목록으로
      </Link>

      <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-xl p-6">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-snug">{notice.title}</h1>
          {canManage && (
            <div className="flex items-center gap-3 shrink-0 mt-1">
              <button
                onClick={() => router.push(`/notices/${id}/edit`)}
                className="text-xs text-gray-400 hover:text-indigo-500 transition"
              >
                수정
              </button>
              <button onClick={handleDelete} className="text-xs text-gray-400 hover:text-red-500 transition">
                삭제
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 dark:text-gray-500 mb-6">
          <span className="font-medium text-gray-600 dark:text-gray-300">{notice.author.name}</span>
          <span>·</span>
          <span>{new Date(notice.created_at).toLocaleString('ko')}</span>
          <span>·</span>
          <span>조회 {notice.view_count}</span>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
          <PostContent content={notice.content} />
        </div>

        {notice.attachments && notice.attachments.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-800 mt-6 pt-4">
            <p className="text-xs font-semibold text-gray-400 mb-2">첨부파일</p>
            <ul className="space-y-1.5">
              {notice.attachments.map((a) => (
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

      {/* 댓글 */}
      <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-xl mt-4 p-6">
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-4">댓글 ({comments.length})</p>

        {comments.length === 0 ? (
          <p className="text-sm text-gray-400 mb-4">아직 댓글이 없습니다.</p>
        ) : (
          <ul className="space-y-4 mb-5">
            {comments.map((c) => (
              <li key={c.id} className="border-b border-gray-100 dark:border-gray-800/60 pb-4 last:border-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{c.author.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleString('ko')}</span>
                    {user && (user.id === c.author.id || user.role === 'ADMIN') && (
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
              </li>
            ))}
          </ul>
        )}

        {user ? (
          <form onSubmit={submitComment}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="댓글을 입력하세요."
              rows={3}
              className="w-full bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#2a2a2a] text-gray-800 dark:text-gray-200 text-sm rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-indigo-500 transition placeholder-gray-400 dark:placeholder-gray-600"
            />
            <div className="flex justify-end mt-2">
              <button
                type="submit"
                className="flex items-center gap-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-semibold px-4 py-1.5 rounded-lg hover:opacity-80 transition"
              >
                ✏️ 작성
              </button>
            </div>
          </form>
        ) : (
          <Link href="/login" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
            로그인 후 댓글 작성 가능
          </Link>
        )}
      </div>
    </div>
  )
}
