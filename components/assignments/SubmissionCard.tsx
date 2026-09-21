'use client'
import { useEffect, useState } from 'react'
import {
  createSubmissionComment,
  deleteSubmission as apiDeleteSubmission,
  deleteSubmissionComment,
  getSubmission,
  gradeSubmission,
  listSubmissionComments,
} from '@/lib/api/assignments'
import { GRADE_COLOR, GRADE_LABEL } from '@/lib/grade'
import { realtimeHub } from '@/lib/ws'
import RichTextEditor from '@/components/RichTextEditor'
import AttachmentPicker from '@/components/AttachmentPicker'
import { formatTimestamp, toDate } from '@/lib/formatDeadline'
import { toDownloadUrl } from '@/lib/downloadUrl'
import { textLength } from '@/lib/richText'
import type { Grade, Submission, SubmissionComment, UploadResult, User } from '@/lib/types'
import { errorMessage, useToast } from '@/components/Toast'
import { useConfirm } from '@/components/ConfirmDialog'
import { ArrowLeft, Paperclip, Pencil } from 'lucide-react'

/**
 * 제출물 하나를 펼쳐 보는 카드. 본문·첨부와 채점, 제출물에 달린 댓글을 다룬다.
 */
export default function SubmissionCard({
  assignmentId,
  submissionId,
  currentUser,
  canReview = false,
  onBack,
  onEdit,
  onChanged,
  onDeleted,
}: {
  assignmentId: string
  submissionId: number
  currentUser: User | null
  /** 이 과제를 채점할 수 있는가 (관리자 또는 이 과제를 낸 멘토) */
  canReview?: boolean
  onBack?: () => void
  onEdit?: () => void
  onChanged?: () => void
  onDeleted?: () => void
}) {
  const toast = useToast()
  const confirm = useConfirm()
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [comments, setComments] = useState<SubmissionComment[]>([])
  const [loading, setLoading] = useState(true)
  const [commentContent, setCommentContent] = useState('')
  const [commentFile, setCommentFile] = useState<UploadResult | null>(null)
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([getSubmission(assignmentId, submissionId), listSubmissionComments(assignmentId, submissionId)])
      .then(([s, c]) => {
        setSubmission(s)
        setComments(c)
      })
      .finally(() => setLoading(false))
  }, [assignmentId, submissionId])

  useEffect(() => {
    return realtimeHub.on('assignment_submission_event', (data) => {
      if (String(data.assignment_id) !== String(assignmentId) || data.submission_id !== submissionId) return
      Promise.all([getSubmission(assignmentId, submissionId), listSubmissionComments(assignmentId, submissionId)])
        .then(([s, c]) => {
          setSubmission(s)
          setComments(c)
        })
        .catch(() => onDeleted?.())
    })
  }, [assignmentId, submissionId])

  async function setGrade(grade: Grade | null) {
    const result = await gradeSubmission(assignmentId, submissionId, grade)
    setSubmission(result)
    onChanged?.()
  }

  async function postComment() {
    if (!commentContent.trim() && !commentFile) return
    setPosting(true)
    try {
      const comment = await createSubmissionComment(assignmentId, submissionId, commentContent, commentFile)
      setComments((prev) => [...prev, comment])
      setCommentContent('')
      setCommentFile(null)
      onChanged?.()
    } catch (err: unknown) {
      toast(errorMessage(err), 'error')
    } finally {
      setPosting(false)
    }
  }

  async function deleteComment(commentId: number) {
    const confirmed = await confirm({
      message: '댓글을 삭제하시겠습니까?',
      confirmLabel: '삭제',
      destructive: true,
    })
    if (!confirmed) return
    await deleteSubmissionComment(commentId)
    setComments((prev) => prev.filter((c) => c.id !== commentId))
    onChanged?.()
  }

  async function deleteThisSubmission() {
    const confirmed = await confirm({
      message: '제출물을 삭제하시겠습니까?',
      confirmLabel: '삭제',
      destructive: true,
    })
    if (!confirmed) return
    await apiDeleteSubmission(assignmentId, submissionId)
    onDeleted?.()
  }

  if (loading || !submission) {
    return <div className="text-sm text-gray-400 text-center py-10">불러오는 중...</div>
  }

  const canDeleteComment = (c: SubmissionComment) =>
    !!currentUser && (currentUser.id === c.author.id || currentUser.role === 'ADMIN')
  const canDeleteSubmission =
    !!currentUser && (currentUser.id === submission.user.id || currentUser.role === 'ADMIN')

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0 overflow-y-auto">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition mb-3"
          >
            <ArrowLeft aria-hidden="true" className="size-3.5" />
            목록으로
          </button>
        )}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded font-medium">
            최종제출
          </span>
          {submission.grade && (
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${GRADE_COLOR[submission.grade]}`}>
              {GRADE_LABEL[submission.grade]}
            </span>
          )}
          {onEdit && (
            <button onClick={onEdit} className="ml-auto text-xs text-gray-400 hover:text-gray-500 transition">
              수정
            </button>
          )}
          {canDeleteSubmission && (
            <button
              onClick={deleteThisSubmission}
              className={`text-xs text-gray-400 hover:text-red-500 transition ${onEdit ? '' : 'ml-auto'}`}
            >
              삭제
            </button>
          )}
        </div>
        <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1">{submission.title}</h2>
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 mb-4">
          <span className="font-medium text-gray-600 dark:text-gray-300">{submission.user.name}</span>
          {submission.user.plan && (
            <>
              <span aria-hidden="true">·</span>
              <span>{submission.user.plan.name}</span>
            </>
          )}
          {/* 주의/경고는 관리자만 본다 — 다른 회원에게 노출할 정보가 아니다. */}
          {currentUser?.role === 'ADMIN' && (
            <>
              <span aria-hidden="true">·</span>
              <span className={submission.user.caution_count > 0 ? 'text-gray-600 dark:text-gray-300' : ''}>
                주의: {submission.user.caution_count ?? 0}회
              </span>
              <span aria-hidden="true">/</span>
              <span className={submission.user.warning_count > 0 ? 'text-red-500' : ''}>
                경고: {submission.user.warning_count ?? 0}회
              </span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{formatTimestamp(submission.submitted_at ?? submission.created_at)}</span>
        </div>

        {canReview && (
          <div className="flex items-center gap-2 mb-4">
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

        <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
          <RichTextEditor content={submission.content} editable={false} />
        </div>

        {submission.attachment_url && (
          <div className="border-t border-gray-200 dark:border-gray-800 mt-4 pt-3">
            <a
              href={toDownloadUrl(submission.attachment_url, submission.attachment_filename ?? 'attachment')}
              className="inline-flex items-center gap-1.5 text-sm text-gray-900 dark:text-white hover:underline"
            >
              <Paperclip aria-hidden="true" className="size-3.5" />
              {submission.attachment_filename}
            </a>
          </div>
        )}

        <div className="border-t border-gray-200 dark:border-gray-800 mt-5 pt-4">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">댓글 ({comments.length})</p>
          {comments.length === 0 ? (
            <p className="text-sm text-gray-400 mb-3">아직 댓글이 없습니다.</p>
          ) : (
            <ul className="space-y-3 mb-3">
              {comments.map((c) => (
                <li key={c.id} className="border-b border-gray-100 dark:border-gray-800/60 pb-3 last:border-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{c.author.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{toDate(c.created_at).toLocaleString('ko')}</span>
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
                      href={toDownloadUrl(c.attachment_url, c.attachment_filename ?? 'attachment')}
                      className="inline-flex items-center gap-1.5 text-xs text-gray-900 dark:text-white hover:underline mt-1"
                    >
                      <Paperclip aria-hidden="true" className="size-3.5" />
                      {c.attachment_filename}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {currentUser && (
        <div className="shrink-0 space-y-2 pt-3 border-t border-gray-200 dark:border-gray-800">
          <RichTextEditor
            content={commentContent}
            onChange={setCommentContent}
            placeholder="'/'를 입력하여 작성을 시작해보세요."
          />
          <div className="flex items-center justify-between gap-3">
            <AttachmentPicker
              value={commentFile ? [commentFile] : []}
              onChange={(files) => setCommentFile(files[files.length - 1] ?? null)}
            />
            <span className="ml-auto shrink-0 text-xs text-gray-400 tabular-nums">
              {textLength(commentContent)}자
            </span>
            <button
              onClick={postComment}
              disabled={posting}
              className="shrink-0 flex items-center gap-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-semibold px-4 py-1.5 rounded-lg hover:opacity-80 transition disabled:opacity-50"
            >
              <Pencil aria-hidden="true" className="size-3.5" />
              작성
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
