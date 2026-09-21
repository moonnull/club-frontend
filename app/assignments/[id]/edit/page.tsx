'use client'
import { errorMessage } from '@/components/Toast'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getAssignment, updateAssignment } from '@/lib/api/assignments'
import { notifyAssignmentListChanged } from '@/lib/events'
import { getStoredUser } from '@/lib/session'
import LoadFailure from '@/components/LoadFailure'
import RichTextEditor from '@/components/RichTextEditor'
import AttachmentPicker from '@/components/AttachmentPicker'
import AssignmentScopeFields from '@/components/AssignmentScopeFields'
import FormHeader from '@/components/FormHeader'
import { toDate } from '@/lib/formatDeadline'
import type { Assignment, UploadResult, User } from '@/lib/types'

function toLocalInput(iso: string): string {
  const d = toDate(iso)
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
  const [trackId, setTrackId] = useState('')
  const [planId, setPlanId] = useState('')
  const [files, setFiles] = useState<UploadResult[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<unknown>(null)

  useEffect(() => {
    setAssignment(null)
    setLoadError(null)
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
        setTrackId(a.track ? String(a.track.id) : '')
        setPlanId(a.plan ? String(a.plan.id) : '')
        setFiles(a.files)
      })
      .catch(setLoadError)
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
        track_id: trackId ? Number(trackId) : null,
        plan_id: planId ? Number(planId) : null,
        files,
      })
      notifyAssignmentListChanged()
      router.push(`/assignments/${id}`)
    } catch (err: unknown) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loadError) {
    return (
      <LoadFailure error={loadError} notFoundText="과제를 찾을 수 없습니다." className="py-24" />
    )
  }

  if (!assignment || !user) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-gray-400">불러오는 중...</div>
    )
  }

  // 과제는 낸 사람 본인과 관리자만 고친다 (백엔드 _can_manage와 같은 규칙).
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
      <FormHeader heading="과제 수정" onCancel={() => router.push(`/assignments/${id}`)} />

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
            disabled={saving}
            className="shrink-0 btn-primary px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </form>
  )
}
