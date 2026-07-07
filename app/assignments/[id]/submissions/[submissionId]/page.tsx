'use client'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { api, getStoredUser } from '@/lib/api'
import RichTextEditor from '@/components/RichTextEditor'
import AttachmentPicker from '@/components/AttachmentPicker'
import type { Assignment, Grade, Submission, SubmissionComment, UploadResult, User } from '@/lib/types'

const GRADE_LABEL: Record<string, string> = { PASS: '합격', FAIL: '불합격' }
const GRADE_COLOR: Record<string, string> = {
  PASS: 'bg-green-500/15 text-green-500',
  FAIL: 'bg-red-500/15 text-red-500',
}

export default function SubmissionDetailPage() {
  const { id, submissionId } = useParams<{ id: string; submissionId: string }>()
  const router = useRouter()
  const user = getStoredUser<User>()

  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [comments, setComments] = useState<SubmissionComment[]>([])
  const [commentContent, setCommentContent] = useState('')
  const [commentFile, setCommentFile] = useState<UploadResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [posting, setPosting] = useState(false)

  function load() {
    setLoading(true)
    setNotFound(false)
    setAssignment(null)
    setSubmission(null)
    setComments([])
    Promise.all([
      api.get<Assignment>(`/api/assignments/${id}`),
      api.get<Submission>(`/api/assignments/${id}/submissions/${submissionId}`),
      api.get<SubmissionComment[]>(`/api/assignments/${id}/submissions/${submissionId}/comments`),
    ])
      .then(([a, s, c]) => {
        setAssignment(a)
        setSubmission(s)
        setComments(c)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }

  useEffect(load, [id, submissionId])

  async function setGrade(grade: Grade | null) {
    const result = await api.put<Submission>(`/api/assignments/${id}/submissions/${submissionId}/grade`, { grade })
    setSubmission(result)
  }

  async function postComment() {
    if (!commentContent.trim() && !commentFile) return
    setPosting(true)
    try {
      const comment = await api.post<SubmissionComment>(
        `/api/assignments/${id}/submissions/${submissionId}/comments`,
        { content: commentContent, attachment: commentFile }
      )
      setComments((prev) => [...prev, comment])
      setCommentContent('')
      setCommentFile(null)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setPosting(false)
    }
  }

  async function deleteComment(commentId: number) {
    if (!confirm('댓글을 삭제하시겠습니까?')) return
    await api.del(`/api/submission-comments/${commentId}`)
    setComments((prev) => prev.filter((c) => c.id !== commentId))
  }

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-sm text-gray-400">불러오는 중...</div>
  }
  if (notFound || !assignment || !submission) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-gray-400">제출물을 찾을 수 없습니다.</div>
    )
  }

  const canDeleteComment = (c: SubmissionComment) =>
    !!user && (user.id === c.author.id || user.role === 'ADMIN')

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link
        href={`/assignments/${id}`}
        className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition mb-4"
      >
        ← 뒤로 가기
      </Link>

      <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded font-medium">
            최종제출
          </span>
          {submission.grade && (
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${GRADE_COLOR[submission.grade]}`}>
              {GRADE_LABEL[submission.grade]}
            </span>
          )}
        </div>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
          {submission.title || `${assignment.title}_${submission.user.name} 제출`}
        </h1>
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-5">
          <span className="font-medium text-gray-600 dark:text-gray-300">{submission.user.name}</span>
          <span>·</span>
          <span>{new Date(submission.submitted_at ?? submission.created_at).toLocaleString('ko')}</span>
        </div>

        {user?.role === 'ADMIN' && (
          <div className="flex items-center gap-2 mb-5">
            <button
              onClick={() => setGrade('PASS')}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                submission.grade === 'PASS'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-green-900/30'
              }`}
            >
              합격
            </button>
            <button
              onClick={() => setGrade('FAIL')}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                submission.grade === 'FAIL'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-red-100 dark:hover:bg-red-900/30'
              }`}
            >
              불합격
            </button>
            {submission.grade && (
              <button
                onClick={() => setGrade(null)}
                className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
              >
                판정 취소
              </button>
            )}
          </div>
        )}

        <div className="border-t border-gray-200 dark:border-gray-800 pt-5">
          <RichTextEditor content={submission.content} editable={false} />
        </div>

        {submission.attachment_url && (
          <div className="border-t border-gray-200 dark:border-gray-800 mt-5 pt-4">
            <a
              href={submission.attachment_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              📎 {submission.attachment_filename}
            </a>
          </div>
        )}
      </div>

      {/* 댓글 */}
      <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-xl mt-4 p-6">
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-4">댓글 ({comments.length})</p>

        {comments.length === 0 ? (
          <p className="text-sm text-gray-400 mb-4">아직 댓글이 없습니다.</p>
        ) : (
          <ul className="space-y-4 mb-5">
            {comments.map((c) => (
              <li key={c.id} className="border-b border-gray-100 dark:border-gray-800/60 pb-4 last:border-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{c.author.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleString('ko')}</span>
                    {canDeleteComment(c) && (
                      <button
                        onClick={() => deleteComment(c.id)}
                        className="text-xs text-gray-400 hover:text-red-500 transition"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                </div>
                <RichTextEditor content={c.content} editable={false} />
                {c.attachment_url && (
                  <a
                    href={c.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline mt-1"
                  >
                    📎 {c.attachment_filename}
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}

        {user ? (
          <div className="space-y-2">
            <RichTextEditor
              content={commentContent}
              onChange={setCommentContent}
              placeholder="'/'를 입력하여 작성을 시작해보세요."
            />
            <div className="flex items-center justify-between gap-3">
              <AttachmentPicker value={commentFile ? [commentFile] : []} onChange={(files) => setCommentFile(files[files.length - 1] ?? null)} />
              <button
                onClick={postComment}
                disabled={posting}
                className="shrink-0 flex items-center gap-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-semibold px-4 py-1.5 rounded-lg hover:opacity-80 transition disabled:opacity-50"
              >
                ✏️ 작성
              </button>
            </div>
          </div>
        ) : (
          <Link href="/login" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
            로그인 후 댓글 작성 가능
          </Link>
        )}
      </div>
    </div>
  )
}
