'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { listBoards } from '@/lib/api/boards'
import { createPost } from '@/lib/api/posts'
import { getStoredUser } from '@/lib/session'
import AttachmentPicker from '@/components/AttachmentPicker'
import RichTextEditor from '@/components/RichTextEditor'
import type { BoardCategory, UploadResult, User } from '@/lib/types'

export default function NewPostPage() {
  const router = useRouter()
  const user = getStoredUser<User>()
  const [boards, setBoards] = useState<BoardCategory[]>([])
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [content, setContent] = useState('')
  const [boardType, setBoardType] = useState('')
  const [attachments, setAttachments] = useState<UploadResult[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    listBoards().then((all) => {
      const writable = all.filter((b) => b.key !== 'NOTICE' && (!b.admin_only || user?.role === 'ADMIN'))
      setBoards(writable)
      setBoardType((prev) => prev || writable[0]?.key || '')
    })
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const post = await createPost({
        title,
        content,
        board_type: boardType,
        summary: summary.trim() || undefined,
        attachments,
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
    <form onSubmit={submit} className="relative flex flex-col h-[calc(100vh-56px)]">
      <div className="flex items-center justify-between px-8 py-4 border-b border-gray-200/60 dark:border-gray-800/60 shrink-0">
        <h1 className="text-xl font-bold brand-text">글쓰기</h1>
        <button
          type="button"
          onClick={() => router.push('/posts')}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white panel rounded-lg px-3 py-1.5 transition"
        >
          ✕ 작성 취소
        </button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-3 px-8 py-5">
        <select
          value={boardType}
          onChange={(e) => setBoardType(e.target.value)}
          className="w-full panel text-gray-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 transition shrink-0"
        >
          {boards.map((b) => (
            <option key={b.key} value={b.key}>{b.name}</option>
          ))}
        </select>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력하세요"
          required
          className="w-full panel text-xl font-bold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-400 transition shrink-0"
        />
        <input
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="짧은 요약 (선택, 목록에 표시됩니다)"
          maxLength={120}
          className="w-full panel text-sm text-gray-600 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 transition shrink-0"
        />
        <RichTextEditor
          content={content}
          onChange={setContent}
          placeholder="'/'를 입력하여 작성을 시작해보세요."
          fullHeight
        />
        <div className="shrink-0">
          <AttachmentPicker value={attachments} onChange={setAttachments} />
        </div>
        {error && <p className="text-red-500 text-sm shrink-0">{error}</p>}
        <div className="flex justify-end shrink-0">
          <button
            type="submit"
            disabled={loading || !boardType}
            className="btn-primary px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {loading ? '등록 중...' : '등록'}
          </button>
        </div>
      </div>
    </form>
  )
}
