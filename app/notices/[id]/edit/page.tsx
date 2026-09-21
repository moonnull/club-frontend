'use client'
import { errorMessage } from '@/components/Toast'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getPost, updatePost } from '@/lib/api/posts'
import { listTracks } from '@/lib/api/tracks'
import { getStoredUser } from '@/lib/session'
import LoadFailure from '@/components/LoadFailure'
import AttachmentPicker from '@/components/AttachmentPicker'
import FormHeader from '@/components/FormHeader'
import LegacyContentEditor from '@/components/LegacyContentEditor'
import RichTextEditor from '@/components/RichTextEditor'
import { isRichTextContent } from '@/components/PostContent'
import type { Post, Track, UploadResult, User } from '@/lib/types'

export default function EditNoticePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const user = getStoredUser<User>()
  const [notice, setNotice] = useState<Post | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [trackId, setTrackId] = useState('')
  const [tracks, setTracks] = useState<Track[]>([])
  const [isLegacy, setIsLegacy] = useState(false)
  const [attachments, setAttachments] = useState<UploadResult[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<unknown>(null)

  useEffect(() => {
    listTracks().then(setTracks)
  }, [])

  useEffect(() => {
    setNotice(null)
    setLoadError(null)
    setTitle('')
    setContent('')
    setAttachments([])
    getPost(id)
      .then((p) => {
        setNotice(p)
        setTitle(p.title)
        setContent(p.content)
        setTrackId(p.track ? String(p.track.id) : '')
        setIsLegacy(!isRichTextContent(p.content))
        setAttachments(p.attachments ?? [])
      })
      .catch(setLoadError)
  }, [id])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await updatePost(id, { title, content, track_id: trackId ? Number(trackId) : null, attachments })
      router.push(`/notices/${id}`)
    } catch (err: unknown) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loadError) {
    return <LoadFailure error={loadError} notFoundText="공지사항을 찾을 수 없습니다." />
  }
  if (!notice || !user) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)] text-sm text-gray-400">
        불러오는 중...
      </div>
    )
  }

  const canEdit = user.id === notice.author.id || user.role === 'ADMIN'
  if (!canEdit) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)] text-sm text-gray-400">
        수정 권한이 없습니다.
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col h-[calc(100vh-56px)]">
      <FormHeader heading="공지 수정" onCancel={() => router.push(`/notices/${id}`)} />

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
        {isLegacy ? (
          <>
            <LegacyContentEditor
              content={content}
              onChange={setContent}
              className="w-full flex-1 min-h-0 bg-white dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 rounded-lg px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-gray-400 transition"
            />
          </>
        ) : (
          <RichTextEditor
            content={content}
            onChange={setContent}
            placeholder="'/'를 입력하여 작성을 시작해보세요."
            fullHeight
          />
        )}
        <div className="shrink-0">
          <AttachmentPicker value={attachments} onChange={setAttachments} />
        </div>
        {error && <p className="text-red-500 text-sm shrink-0">{error}</p>}
        <div className="flex justify-end shrink-0">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </form>
  )
}
