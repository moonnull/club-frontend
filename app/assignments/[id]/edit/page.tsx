'use client'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getAssignment, updateAssignment } from '@/lib/api/assignments'
import { getStoredUser } from '@/lib/session'
import RichTextEditor from '@/components/RichTextEditor'
import AttachmentPicker from '@/components/AttachmentPicker'
import type { Assignment, UploadResult, User } from '@/lib/types'

function toLocalInput(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function EditAssignmentPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const user = getStoredUser<User>()

  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [files, setFiles] = useState<UploadResult[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    setAssignment(null)
    setNotFound(false)
    setTitle('')
    setContent('')
    setStartAt('')
    setEndAt('')
    setFiles([])
    getAssignment(id)
      .then((a) => {
        setAssignment(a)
        setTitle(a.title)
        setContent(a.content)
        setStartAt(toLocalInput(a.start_at))
        setEndAt(toLocalInput(a.end_at))
        setFiles(a.files)
      })
      .catch(() => setNotFound(true))
  }, [id])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await updateAssignment(id, {
        title,
        content,
        start_at: new Date(startAt).toISOString(),
        end_at: new Date(endAt).toISOString(),
        files,
      })
      router.push(`/assignments/${id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (notFound) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-gray-400">
        과제를 찾을 수 없습니다.
      </div>
    )
  }

  if (!assignment || !user) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-gray-400">불러오는 중...</div>
    )
  }

  const canEdit = user.id === assignment.author.id || user.role === 'ADMIN'
  if (!canEdit) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-gray-400">
        수정 권한이 없습니다.
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col h-full">
      <div className="flex items-center justify-between px-8 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">과제 수정</h1>
        <button
          type="button"
          onClick={() => router.push(`/assignments/${id}`)}
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
          className="w-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] text-xl font-bold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition shrink-0"
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
            disabled={saving}
            className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </form>
  )
}
