'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createAssignment } from '@/lib/api/assignments'
import { listTracks } from '@/lib/api/tracks'
import { getStoredUser } from '@/lib/session'
import RichTextEditor from '@/components/RichTextEditor'
import AttachmentPicker from '@/components/AttachmentPicker'
import type { Track, UploadResult, User } from '@/lib/types'

export default function NewAssignmentPage() {
  const router = useRouter()
  const user = getStoredUser<User>()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [trackId, setTrackId] = useState('')
  const [tracks, setTracks] = useState<Track[]>([])
  const [files, setFiles] = useState<UploadResult[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    listTracks().then(setTracks)
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const assignment = await createAssignment({
        title,
        content,
        start_at: new Date(startAt).toISOString(),
        end_at: new Date(endAt).toISOString(),
        track_id: trackId ? Number(trackId) : null,
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
    <form onSubmit={submit} className="flex flex-col h-full">
      <div className="flex items-center justify-between px-8 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <h1 className="text-xl font-bold gradient-text">과제 등록</h1>
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
          className="w-full glass-panel text-xl font-bold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition shrink-0"
        />

        <div className="flex gap-3 shrink-0">
          <label className="flex-1 text-xs text-gray-400">
            제출 시작
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              required
              className="mt-1 w-full glass-panel text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            />
          </label>
          <label className="flex-1 text-xs text-gray-400">
            제출 마감
            <input
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              required
              className="mt-1 w-full glass-panel text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            />
          </label>
        </div>

        <select
          value={trackId}
          onChange={(e) => setTrackId(e.target.value)}
          className="w-full glass-panel text-sm text-gray-700 dark:text-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition shrink-0"
        >
          <option value="">전체 과제 (모든 회원에게 표시)</option>
          {tracks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} 트랙 전용
            </option>
          ))}
        </select>

        <RichTextEditor content={content} onChange={setContent} fullHeight />

        {error && <p className="text-red-500 text-sm shrink-0">{error}</p>}

        <div className="flex items-center justify-between gap-3 shrink-0 pt-2">
          <AttachmentPicker value={files} onChange={setFiles} />
          <button
            type="submit"
            disabled={loading}
            className="shrink-0 gradient-btn px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {loading ? '등록 중...' : '등록'}
          </button>
        </div>
      </div>
    </form>
  )
}
