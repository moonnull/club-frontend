'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createAssignment } from '@/lib/api/assignments'
import { notifyAssignmentListChanged } from '@/lib/events'
import { getStoredUser } from '@/lib/session'
import { isAssignmentStaff } from '@/lib/role'
import RichTextEditor from '@/components/RichTextEditor'
import AttachmentPicker from '@/components/AttachmentPicker'
import AssignmentScopeFields from '@/components/AssignmentScopeFields'
import FormHeader from '@/components/FormHeader'
import type { UploadResult, User } from '@/lib/types'

export default function NewAssignmentPage() {
  const router = useRouter()
  const user = getStoredUser<User>()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [trackId, setTrackId] = useState('')
  const [planId, setPlanId] = useState('')
  const [files, setFiles] = useState<UploadResult[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
        plan_id: planId ? Number(planId) : null,
        files,
      })
      notifyAssignmentListChanged()
      router.push(`/assignments/${assignment.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (!isAssignmentStaff(user)) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-gray-400">
        관리자 또는 멘토만 접근할 수 있습니다.
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col h-full">
      <FormHeader heading="과제 등록" onCancel={() => router.push('/assignments')} />

      <div className="flex-1 min-h-0 flex flex-col gap-3 px-4 md:px-8 py-5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력하세요"
          required
          className="w-full panel text-xl font-bold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-400 transition shrink-0"
        />

        <AssignmentScopeFields
          startAt={startAt}
          endAt={endAt}
          trackId={trackId}
          planId={planId}
          onChange={(next) => {
            if (next.startAt !== undefined) setStartAt(next.startAt)
            if (next.endAt !== undefined) setEndAt(next.endAt)
            if (next.trackId !== undefined) setTrackId(next.trackId)
            if (next.planId !== undefined) setPlanId(next.planId)
          }}
        />

        <RichTextEditor content={content} onChange={setContent} fullHeight />

        {error && <p className="text-red-500 text-sm shrink-0">{error}</p>}

        <div className="flex items-center justify-between gap-3 shrink-0 pt-2">
          <AttachmentPicker value={files} onChange={setFiles} />
          <button
            type="submit"
            disabled={loading}
            className="shrink-0 btn-primary px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {loading ? '등록 중...' : '등록'}
          </button>
        </div>
      </div>
    </form>
  )
}
