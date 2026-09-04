'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createPost } from '@/lib/api/posts'
import { listTracks } from '@/lib/api/tracks'
import { getStoredUser } from '@/lib/session'
import AttachmentPicker from '@/components/AttachmentPicker'
import RichTextEditor from '@/components/RichTextEditor'
import type { Track, UploadResult, User } from '@/lib/types'
import { X } from 'lucide-react'

export default function NewNoticePage() {
  const router = useRouter()
  const user = getStoredUser<User>()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [trackId, setTrackId] = useState('')
  const [tracks, setTracks] = useState<Track[]>([])
  const [attachments, setAttachments] = useState<UploadResult[]>([])
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
      const post = await createPost({
        title,
        content,
        board_type: 'NOTICE',
        track_id: trackId ? Number(trackId) : null,
        attachments,
      })
      router.push(`/notices/${post.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)] text-sm text-gray-400">
        관리자만 접근할 수 있습니다.
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col h-[calc(100vh-56px)]">
      <div className="flex items-center justify-between px-8 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <h1 className="text-xl font-bold brand-text">공지 작성</h1>
        <button
          type="button"
          onClick={() => router.push('/notices')}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 transition"
        >
          <X aria-hidden="true" className="size-3.5" />
          작성 취소
        </button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-3 px-8 py-5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력하세요"
          required
          className="w-full bg-white dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 text-xl font-bold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-400 transition shrink-0"
        />
        <select
          value={trackId}
          onChange={(e) => setTrackId(e.target.value)}
          className="w-full bg-white dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 text-sm text-gray-700 dark:text-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 transition shrink-0"
        >
          <option value="">전체 공지 (모든 회원에게 표시)</option>
          {tracks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} 트랙 전용
            </option>
          ))}
        </select>
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
            disabled={loading}
            className="btn-primary px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {loading ? '등록 중...' : '등록'}
          </button>
        </div>
      </div>
    </form>
  )
}
