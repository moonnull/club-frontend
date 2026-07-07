'use client'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { api, getStoredUser } from '@/lib/api'
import RichTextEditor from '@/components/RichTextEditor'
import AttachmentPicker from '@/components/AttachmentPicker'
import { formatDeadline, isBeforeStart, isPastDeadline } from '@/lib/formatDeadline'
import type { Assignment, Submission, UploadResult, User } from '@/lib/types'

export default function SubmitAssignmentPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const user = getStoredUser<User>()

  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [content, setContent] = useState('')
  const [file, setFile] = useState<UploadResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setAssignment(null)
    setSubmission(null)
    setContent('')
    setFile(null)
    Promise.all([
      api.get<Assignment>(`/api/assignments/${id}`),
      api.get<Submission | null>(`/api/assignments/${id}/submission`),
    ])
      .then(([a, sub]) => {
        setAssignment(a)
        if (sub) {
          setSubmission(sub)
          setContent(sub.content)
          if (sub.attachment_url) {
            setFile({
              url: sub.attachment_url,
              filename: sub.attachment_filename ?? '',
              content_type: sub.attachment_content_type ?? '',
              size: sub.attachment_size ?? 0,
            })
          }
        }
      })
      .finally(() => setLoading(false))
  }, [id])

  async function save(isFinal: boolean) {
    setError('')
    setSaving(true)
    try {
      const result = await api.put<Submission>(`/api/assignments/${id}/submission`, {
        content,
        attachment: file,
        is_final: isFinal,
      })
      setSubmission(result)
      if (isFinal) {
        router.push(`/assignments/${id}/submissions/${result.id}`)
      } else {
        alert('임시 저장되었습니다.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-gray-400">로그인이 필요합니다.</div>
    )
  }
  if (loading || !assignment) {
    return <div className="flex items-center justify-center py-24 text-sm text-gray-400">불러오는 중...</div>
  }

  const notStarted = isBeforeStart(assignment.start_at)
  const closed = isPastDeadline(assignment.end_at)
  const canSubmit = !notStarted && !closed

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      <div className="flex items-center justify-between px-8 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">과제 제출</h1>
          <p className="text-xs text-gray-400 mt-1">
            {assignment.title} · 제출 기한 {formatDeadline(assignment.start_at, assignment.end_at)}
          </p>
        </div>
        <button
          onClick={() => router.push(`/assignments/${id}`)}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 transition"
        >
          ✕ 작성 취소
        </button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col px-8 py-5">
        {submission?.is_final && (
          <p className="text-sm text-green-500 mb-3 shrink-0">✓ 이미 최종 제출했습니다. 마감 전까지는 다시 수정할 수 있습니다.</p>
        )}

        {notStarted ? (
          <p className="text-sm text-gray-400">아직 제출 기간이 시작되지 않았습니다.</p>
        ) : closed && !submission ? (
          <p className="text-sm text-gray-400">제출 기간이 종료되었습니다.</p>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col gap-3">
            <RichTextEditor
              content={content}
              onChange={setContent}
              editable={canSubmit}
              placeholder="'/'를 입력하여 작성을 시작해보세요."
              fullHeight
            />
            {error && <p className="text-red-500 text-sm shrink-0">{error}</p>}

            {canSubmit && (
              <div className="flex items-center justify-between gap-3 shrink-0 pt-2">
                <AttachmentPicker value={file ? [file] : []} onChange={(files) => setFile(files[files.length - 1] ?? null)} />
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => save(false)}
                    disabled={saving}
                    className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
                  >
                    임시 저장
                  </button>
                  <button
                    onClick={() => save(true)}
                    disabled={saving}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
                  >
                    최종 제출
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
