'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { api, getStoredUser } from '@/lib/api'
import AttachmentPicker from '@/components/AttachmentPicker'
import ImageInsertButton from '@/components/ImageInsertButton'
import type { BoardCategory, Post, UploadResult, User } from '@/lib/types'

export default function NewPostPage() {
  const router = useRouter()
  const user = getStoredUser<User>()
  const [boards, setBoards] = useState<BoardCategory[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [boardType, setBoardType] = useState('')
  const [attachments, setAttachments] = useState<UploadResult[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    api.get<BoardCategory[]>('/api/boards').then((all) => {
      const writable = all.filter((b) => !b.admin_only || user?.role === 'ADMIN')
      setBoards(writable)
      setBoardType((prev) => prev || writable[0]?.key || '')
    })
  }, [])

  function insertImage(url: string) {
    const snippet = `![image](${url})`
    const el = textareaRef.current
    if (!el) {
      setContent((c) => `${c}\n${snippet}\n`)
      return
    }
    const start = el.selectionStart ?? content.length
    const end = el.selectionEnd ?? content.length
    setContent(content.slice(0, start) + `\n${snippet}\n` + content.slice(end))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const post = await api.post<Post>('/api/posts', {
        title,
        content,
        board_type: boardType,
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
    <form onSubmit={submit} className="flex flex-col h-[calc(100vh-56px)]">
      <div className="flex items-center justify-between px-8 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">글쓰기</h1>
        <button
          type="button"
          onClick={() => router.push('/posts')}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 transition"
        >
          ✕ 작성 취소
        </button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-3 px-8 py-5">
        <select
          value={boardType}
          onChange={(e) => setBoardType(e.target.value)}
          className="w-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] text-gray-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition shrink-0"
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
          className="w-full bg-transparent text-2xl font-bold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 border-b border-gray-200 dark:border-gray-800 pb-3 focus:outline-none shrink-0"
        />
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="내용을 입력하세요"
          required
          className="w-full flex-1 min-h-0 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 resize-none focus:outline-none"
        />
        <div className="shrink-0">
          <ImageInsertButton onUploaded={insertImage} />
        </div>
        <div className="shrink-0">
          <AttachmentPicker value={attachments} onChange={setAttachments} />
        </div>
        {error && <p className="text-red-500 text-sm shrink-0">{error}</p>}
        <div className="flex justify-end shrink-0">
          <button
            type="submit"
            disabled={loading || !boardType}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition"
          >
            {loading ? '등록 중...' : '등록'}
          </button>
        </div>
      </div>
    </form>
  )
}
