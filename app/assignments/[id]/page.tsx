'use client'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { api, getStoredUser } from '@/lib/api'
import RichTextEditor from '@/components/RichTextEditor'
import AttachmentPicker from '@/components/AttachmentPicker'
import { formatDeadline, isBeforeStart, isPastDeadline } from '@/lib/formatDeadline'
import type { Assignment, Submission, UploadResult, User } from '@/lib/types'

export default function AssignmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const user = getStoredUser<User>()

  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [submissionContent, setSubmissionContent] = useState('')
  const [submissionFile, setSubmissionFile] = useState<UploadResult | null>(null)
  const [allSubmissions, setAllSubmissions] = useState<Submission[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get<Assignment>(`/api/assignments/${id}`)
      .then(async (a) => {
        setAssignment(a)
        try {
          const sub = await api.get<Submission | null>(`/api/assignments/${id}/submission`)
          if (sub) {
            setSubmission(sub)
            setSubmissionContent(sub.content)
          }
        } catch {
          // 제출 이력 없음
        }
        if (user?.role === 'ADMIN') {
          api.get<Submission[]>(`/api/assignments/${id}/submissions`).then(setAllSubmissions)
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  async function handleDelete() {
    if (!confirm('과제를 삭제하시겠습니까? 제출된 내용도 함께 삭제됩니다.')) return
    await api.del(`/api/assignments/${id}`)
    router.push('/assignments')
  }

  async function save(isFinal: boolean) {
    setError('')
    setSaving(true)
    try {
      const result = await api.put<Submission>(`/api/assignments/${id}/submission`, {
        content: submissionContent,
        attachment: submissionFile,
        is_final: isFinal,
      })
      setSubmission(result)
      alert(isFinal ? '최종 제출되었습니다.' : '임시 저장되었습니다.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-gray-400">불러오는 중...</div>
    )
  }
  if (notFound || !assignment) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-gray-400">과제를 찾을 수 없습니다.</div>
    )
  }

  const canManage = user && (user.id === assignment.author.id || user.role === 'ADMIN')
  const notStarted = isBeforeStart(assignment.start_at)
  const closed = isPastDeadline(assignment.end_at)
  const canSubmit = user && !notStarted && !closed

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 flex gap-6 items-start">
      {/* 과제 내용 박스 */}
      <div className="flex-1 min-w-0 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-xl p-6">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{assignment.title}</h1>
          {canManage && (
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => router.push(`/assignments/${id}/edit`)}
                className="text-xs text-gray-400 hover:text-indigo-500 transition"
              >
                수정
              </button>
              <button onClick={handleDelete} className="text-xs text-gray-400 hover:text-red-500 transition">
                삭제
              </button>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-400 mb-1">{assignment.author.name}</p>
        <p className={`text-xs font-medium mb-5 ${closed ? 'text-gray-400' : 'text-indigo-500 dark:text-indigo-400'}`}>
          제출 기한 {formatDeadline(assignment.start_at, assignment.end_at)}
          {closed && ' · 마감됨'}
        </p>

        <RichTextEditor content={assignment.content} editable={false} />

        {assignment.files.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-800 mt-6 pt-4">
            <p className="text-xs font-semibold text-gray-400 mb-2">파일</p>
            <ul className="space-y-1.5">
              {assignment.files.map((f) => (
                <li key={f.id}>
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    📥 {f.filename}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {allSubmissions && (
          <div className="border-t border-gray-200 dark:border-gray-800 mt-6 pt-4">
            <p className="text-xs font-semibold text-gray-400 mb-2">제출 현황 ({allSubmissions.length})</p>
            {allSubmissions.length === 0 ? (
              <p className="text-xs text-gray-400">아직 제출한 사람이 없습니다.</p>
            ) : (
              <ul className="space-y-1.5">
                {allSubmissions.map((s) => (
                  <li key={s.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">{s.user.name}</span>
                    <span className={`text-xs ${s.is_final ? 'text-green-500' : 'text-gray-400'}`}>
                      {s.is_final ? '최종 제출' : '임시 저장'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* 제출 패널 */}
      {user && (
        <div className="w-80 shrink-0 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">과제 제출</p>

          {submission?.is_final && (
            <p className="text-xs text-green-500 mb-2">✓ 최종 제출 완료</p>
          )}

          {notStarted ? (
            <p className="text-xs text-gray-400">아직 제출 기간이 시작되지 않았습니다.</p>
          ) : !canSubmit && !submission ? (
            <p className="text-xs text-gray-400">제출 기간이 종료되었습니다.</p>
          ) : (
            <>
              <RichTextEditor
                content={submissionContent}
                onChange={setSubmissionContent}
                editable={!!canSubmit}
                placeholder="제출 내용을 작성하세요."
              />
              {canSubmit && (
                <div className="mt-2">
                  <AttachmentPicker
                    value={submissionFile ? [submissionFile] : []}
                    onChange={(files) => setSubmissionFile(files[files.length - 1] ?? null)}
                  />
                </div>
              )}
              {submission?.attachment_url && !submissionFile && (
                <a
                  href={submission.attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mt-2 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  📎 {submission.attachment_filename}
                </a>
              )}
              {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
              {canSubmit && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => save(false)}
                    disabled={saving}
                    className="flex-1 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg font-medium transition disabled:opacity-50"
                  >
                    임시 저장
                  </button>
                  <button
                    onClick={() => save(true)}
                    disabled={saving}
                    className="flex-1 text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-medium transition disabled:opacity-50"
                  >
                    최종 제출
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {!user && (
        <div className="w-80 shrink-0 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-xl p-4 text-center">
          <Link href="/login" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
            로그인 후 과제 제출 가능
          </Link>
        </div>
      )}
    </div>
  )
}
