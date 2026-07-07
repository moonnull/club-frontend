'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { api, getStoredUser } from '@/lib/api'
import RichTextEditor from '@/components/RichTextEditor'
import AttachmentPicker from '@/components/AttachmentPicker'
import type { Assignment, UploadResult, User } from '@/lib/types'

export default function NewAssignmentPage() {
  const router = useRouter()
  const user = getStoredUser<User>()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [files, setFiles] = useState<UploadResult[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const assignment = await api.post<Assignment>('/api/assignments', {
        title,
        content,
        start_at: new Date(startAt).toISOString(),
        end_at: new Date(endAt).toISOString(),
        files,
      })
      router.push(`/assignments/${assignment.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-gray-400">
        관리자만 접근할 수 있습니다.
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col h-[calc(100vh-56px)]">
      <div className="flex items-center justify-between px-8 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">과제 등록</h1>
        <button
          type="button"
          onClick={() => router.push('/assignments')}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 transition"
        >
          ✕ 작성 취소
        </button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-3 px-8 py-5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력하세요"
          required
          className="w-full bg-transparent text-2xl font-bold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 border-b border-gray-200 dark:border-gray-800 pb-3 focus:outline-none shrink-0"
        />

        <div className="flex gap-3 shrink-0">
          <label className="flex-1 text-xs text-gray-400">
            제출 시작
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              required
              className="mt-1 w-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            />
          </label>
          <label className="flex-1 text-xs text-gray-400">
            제출 마감
            <input
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              required
              className="mt-1 w-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            />
          </label>
        </div>

        <RichTextEditor content={content} onChange={setContent} fullHeight />

        {error && <p className="text-red-500 text-sm shrink-0">{error}</p>}

        <div className="flex items-center justify-between gap-3 shrink-0 pt-2">
          <AttachmentPicker value={files} onChange={setFiles} />
          <button
            type="submit"
            disabled={loading}
            className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition"
          >
            {loading ? '등록 중...' : '등록'}
          </button>
        </div>
      </div>
    </form>
  )
}
