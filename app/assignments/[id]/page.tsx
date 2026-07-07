'use client'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { api, getStoredUser } from '@/lib/api'
import RichTextEditor from '@/components/RichTextEditor'
import AttachmentPicker from '@/components/AttachmentPicker'
import { formatDeadline, isBeforeStart, isPastDeadline } from '@/lib/formatDeadline'
import type { Assignment, Submission, SubmissionListItem, UploadResult, User } from '@/lib/types'

const GRADE_LABEL: Record<string, string> = { PASS: '합격', FAIL: '불합격' }
const GRADE_COLOR: Record<string, string> = {
  PASS: 'bg-green-500/15 text-green-500',
  FAIL: 'bg-red-500/15 text-red-500',
}

export default function AssignmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const user = getStoredUser<User>()

  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [rightTab, setRightTab] = useState<'write' | 'list'>('write')
  const [mySubmission, setMySubmission] = useState<Submission | null>(null)
  const [submissions, setSubmissions] = useState<SubmissionListItem[]>([])
  const [content, setContent] = useState('')
  const [file, setFile] = useState<UploadResult | null>(null)
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const [splitPercent, setSplitPercent] = useState(62)
  const containerRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)

  useEffect(() => {
    setLoading(true)
    setNotFound(false)
    setAssignment(null)
    setMySubmission(null)
    setSubmissions([])
    setContent('')
    setFile(null)
    setRightTab('write')

    const requests: Promise<unknown>[] = [
      api.get<Assignment>(`/api/assignments/${id}`).then((a) => setAssignment(a)),
      api.get<SubmissionListItem[]>(`/api/assignments/${id}/submissions`).then(setSubmissions),
    ]
    if (user) {
      requests.push(
        api.get<Submission | null>(`/api/assignments/${id}/submission`).then((sub) => {
          if (sub) {
            setMySubmission(sub)
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
      )
    }
    Promise.all(requests)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id, user?.id])

  async function handleDelete() {
    if (!confirm('과제를 삭제하시겠습니까? 제출된 내용도 함께 삭제됩니다.')) return
    await api.del(`/api/assignments/${id}`)
    router.push('/assignments')
  }

  async function save(isFinal: boolean) {
    setSubmitError('')
    setSaving(true)
    try {
      const result = await api.put<Submission>(`/api/assignments/${id}/submission`, {
        content,
        attachment: file,
        is_final: isFinal,
      })
      setMySubmission(result)
      if (isFinal) {
        router.push(`/assignments/${id}/submissions/${result.id}`)
      } else {
        const list = await api.get<SubmissionListItem[]>(`/api/assignments/${id}/submissions`)
        setSubmissions(list)
        alert('임시 저장되었습니다.')
      }
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  function onDividerMouseDown() {
    draggingRef.current = true
    document.body.style.cursor = 'col-resize'
  }

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!draggingRef.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const pct = ((e.clientX - rect.left) / rect.width) * 100
      setSplitPercent(Math.min(78, Math.max(30, pct)))
    }
    function onMouseUp() {
      draggingRef.current = false
      document.body.style.cursor = ''
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center h-full text-sm text-gray-400">불러오는 중...</div>
  }
  if (notFound || !assignment) {
    return <div className="flex items-center justify-center h-full text-sm text-gray-400">과제를 찾을 수 없습니다.</div>
  }

  const canManage = user && (user.id === assignment.author.id || user.role === 'ADMIN')
  const notStarted = isBeforeStart(assignment.start_at)
  const closed = isPastDeadline(assignment.end_at)
  const canSubmit = !!user && !notStarted && !closed

  return (
    <div ref={containerRef} className="flex h-full">
      {/* ── 가운데: 과제 내용 ── */}
      <div style={{ width: `${splitPercent}%` }} className="min-w-0 overflow-y-auto px-8 py-6">
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
      </div>

      {/* ── 드래그 구분선 ── */}
      <div
        onMouseDown={onDividerMouseDown}
        className="w-1.5 shrink-0 cursor-col-resize bg-gray-100 dark:bg-[#1a1a1a] hover:bg-indigo-200 dark:hover:bg-indigo-500/30 flex items-center justify-center transition"
      >
        <span className="text-gray-400 text-xs select-none">⋮</span>
      </div>

      {/* ── 오른쪽: 제출 작성 / 제출 현황 ── */}
      <div style={{ width: `${100 - splitPercent}%` }} className="min-w-0 flex flex-col border-l border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <button
            onClick={() => setRightTab('write')}
            className={`text-sm font-medium transition ${
              rightTab === 'write'
                ? 'text-gray-900 dark:text-white border-b-2 border-indigo-500 pb-0.5'
                : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            제출 작성
          </button>
          <button
            onClick={() => setRightTab('list')}
            className={`text-sm font-medium transition ${
              rightTab === 'list'
                ? 'text-gray-900 dark:text-white border-b-2 border-indigo-500 pb-0.5'
                : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            제출 현황 ({submissions.length})
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          {!user ? (
            <p className="text-sm text-gray-400">로그인 후 과제 제출이 가능합니다.</p>
          ) : rightTab === 'write' ? (
            <div className="flex flex-col h-full gap-3">
              {mySubmission?.is_final && (
                <p className="text-sm text-green-500 shrink-0">✓ 이미 최종 제출했습니다. 마감 전까지는 다시 수정할 수 있습니다.</p>
              )}
              {notStarted ? (
                <p className="text-sm text-gray-400">아직 제출 기간이 시작되지 않았습니다.</p>
              ) : closed && !mySubmission ? (
                <p className="text-sm text-gray-400">제출 기간이 종료되었습니다.</p>
              ) : (
                <>
                  <RichTextEditor
                    content={content}
                    onChange={setContent}
                    editable={canSubmit}
                    placeholder="'/'를 입력하여 작성을 시작해보세요."
                    fullHeight
                  />
                  {submitError && <p className="text-red-500 text-sm shrink-0">{submitError}</p>}
                  {canSubmit && (
                    <div className="flex items-center justify-between gap-3 shrink-0">
                      <AttachmentPicker value={file ? [file] : []} onChange={(files) => setFile(files[files.length - 1] ?? null)} />
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => save(false)}
                          disabled={saving}
                          className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg text-sm font-medium transition disabled:opacity-50"
                        >
                          임시 저장
                        </button>
                        <button
                          onClick={() => save(true)}
                          disabled={saving}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition disabled:opacity-50"
                        >
                          최종 제출
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : submissions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">아직 제출한 사람이 없습니다.</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800/60">
              {submissions.map((s) => (
                <li
                  key={s.id}
                  onClick={() => router.push(`/assignments/${id}/submissions/${s.id}`)}
                  className="py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition -mx-4 px-4"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded font-medium">
                      최종제출
                    </span>
                    {s.grade && (
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${GRADE_COLOR[s.grade]}`}>
                        {GRADE_LABEL[s.grade]}
                      </span>
                    )}
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                      {assignment.title}_{s.user.name} 제출
                    </span>
                    {s.comment_count > 0 && (
                      <span className="text-xs text-indigo-500 dark:text-indigo-400 shrink-0">💬{s.comment_count}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{s.user.name}</span>
                    <span>{new Date(s.submitted_at ?? s.created_at).toLocaleString('ko')}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
