'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { api, getStoredUser } from '@/lib/api'
import type { Post, User } from '@/lib/types'

const BOARDS: { key: Post['board_type']; label: string }[] = [
  { key: 'FREE', label: '자유게시판' },
  { key: 'QNA', label: 'Q&A' },
  { key: 'RECRUIT', label: '모집' },
  { key: 'NOTICE', label: '공지사항' },
]

export default function NewPostPage() {
  const router = useRouter()
  const user = getStoredUser<User>()
  const boards = BOARDS.filter((b) => b.key !== 'NOTICE' || user?.role === 'ADMIN')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [boardType, setBoardType] = useState<Post['board_type']>(boards[0].key)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const post = await api.post<Post>('/api/posts', {
        title,
        content,
        board_type: boardType,
      })
      router.push(`/posts/${post.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)] text-sm text-gray-400">
        로그인이 필요합니다.
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">글쓰기</h1>
      <form onSubmit={submit} className="space-y-3">
        <select
          value={boardType}
          onChange={(e) => setBoardType(e.target.value as Post['board_type'])}
          className="w-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] text-gray-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
        >
          {boards.map((b) => (
            <option key={b.key} value={b.key}>{b.label}</option>
          ))}
        </select>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목"
          required
          className="w-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="내용을 입력하세요"
          required
          rows={12}
          className="w-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => router.push('/posts')}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-800 dark:hover:text-white transition"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition"
          >
            {loading ? '등록 중...' : '등록'}
          </button>
        </div>
      </form>
    </div>
  )
}
