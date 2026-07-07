'use client'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { api, getStoredUser } from '@/lib/api'
import type { Comment, Post, User } from '@/lib/types'

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [loading, setLoading] = useState(true)
  const user = getStoredUser<User>()

  async function load() {
    const [p, c] = await Promise.all([
      api.get<Post>(`/api/posts/${id}`),
      api.get<Comment[]>(`/api/posts/${id}/comments`),
    ])
    setPost(p)
    setComments(c)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function deletePost() {
    if (!confirm('삭제하시겠습니까?')) return
    await api.del(`/api/posts/${id}`)
    router.push('/posts')
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault()
    if (!commentText.trim()) return
    const c = await api.post<Comment>(`/api/posts/${id}/comments`, { content: commentText })
    setComments((prev) => [...prev, c])
    setCommentText('')
  }

  async function deleteComment(commentId: number) {
    await api.del(`/api/comments/${commentId}`)
    setComments((prev) => prev.filter((c) => c.id !== commentId))
  }

  async function adoptComment(commentId: number) {
    const updated = await api.post<Comment>(`/api/posts/${id}/adopt/${commentId}`, {})
    setComments((prev) => prev.map((c) => (c.id === commentId ? updated : { ...c, is_adopted: false })))
    setPost((p) => p ? { ...p, is_closed: true } : p)
  }

  if (loading) return <p className="text-gray-400 text-center py-20">불러오는 중...</p>
  if (!post) return <p className="text-gray-400 text-center py-20">게시글을 찾을 수 없습니다.</p>

  const canEdit = user && (user.id === post.author.id || user.role === 'ADMIN')
  const isMyPost = user?.id === post.author.id

  return (
    <div className="max-w-3xl mx-auto">
      {/* 게시글 헤더 */}
      <div className="bg-white rounded-xl border p-6 mb-4">
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="text-xl font-bold text-gray-900">{post.title}</h1>
          {canEdit && (
            <div className="flex gap-2 shrink-0">
              <button
                onClick={deletePost}
                className="text-sm text-red-400 hover:text-red-600"
              >
                삭제
              </button>
            </div>
          )}
        </div>
        <div className="flex gap-3 text-xs text-gray-400 mb-6">
          <span>{post.author.name}</span>
          <span>조회 {post.view_count}</span>
          <span>{new Date(post.created_at).toLocaleString('ko')}</span>
          {post.is_closed && (
            <span className="text-green-600 font-medium">✓ 채택 완료</span>
          )}
        </div>
        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{post.content}</p>
      </div>

      {/* 댓글 */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="font-semibold mb-4">댓글 {comments.length}개</h2>
        {comments.length === 0 && (
          <p className="text-gray-400 text-sm mb-4">첫 댓글을 남겨보세요.</p>
        )}
        <div className="space-y-3 mb-6">
          {comments.map((c) => (
            <div
              key={c.id}
              className={`rounded-lg p-3 ${c.is_adopted ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{c.author.name}</span>
                  {c.is_adopted && (
                    <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                      채택
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {post.board_type === 'QNA' && isMyPost && !post.is_closed && (
                    <button
                      onClick={() => adoptComment(c.id)}
                      className="text-xs text-green-600 hover:underline"
                    >
                      채택
                    </button>
                  )}
                  {user && (user.id === c.author.id || user.role === 'ADMIN') && (
                    <button
                      onClick={() => deleteComment(c.id)}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      삭제
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.content}</p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(c.created_at).toLocaleString('ko')}
              </p>
            </div>
          ))}
        </div>

        {user ? (
          <form onSubmit={submitComment} className="flex gap-2">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="댓글을 입력하세요..."
              rows={2}
              className="flex-1 border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition self-end"
            >
              등록
            </button>
          </form>
        ) : (
          <p className="text-sm text-gray-400">
            댓글을 작성하려면{' '}
            <a href="/login" className="text-indigo-600 hover:underline">
              로그인
            </a>
            이 필요합니다.
          </p>
        )}
      </div>
    </div>
  )
}
