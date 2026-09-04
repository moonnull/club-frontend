'use client'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  createQuestion,
  createQuestionComment,
  createSubmissionComment,
  deleteAssignment,
  deleteQuestion as apiDeleteQuestion,
  deleteQuestionComment,
  deleteSubmission as apiDeleteSubmission,
  deleteSubmissionComment,
  getAssignment,
  getMySubmission,
  getQuestion,
  getSubmission,
  gradeSubmission,
  listQuestionComments,
  listQuestions,
  listSubmissionComments,
  listSubmissions,
  submitAssignment,
} from '@/lib/api/assignments'
import { getStoredUser } from '@/lib/session'
import { realtimeHub } from '@/lib/ws'
import RichTextEditor from '@/components/RichTextEditor'
import AttachmentPicker from '@/components/AttachmentPicker'
import { formatDeadline, formatTimestamp, isBeforeStart, isPastDeadline, toDate } from '@/lib/formatDeadline'
import { toDownloadUrl } from '@/lib/downloadUrl'
import { textLength } from '@/lib/richText'
import type {
  Assignment,
  AssignmentQuestion,
  AssignmentQuestionComment,
  AssignmentQuestionListItem,
  Grade,
  Submission,
  SubmissionComment,
  SubmissionListItem,
  UploadResult,
  User,
} from '@/lib/types'
import { errorMessage, useToast } from '@/components/Toast'
import { useConfirm } from '@/components/ConfirmDialog'
import { ArrowLeft, Check, Download, GripVertical, MessageSquare, Paperclip, Pencil } from 'lucide-react'

const GRADE_LABEL: Record<string, string> = { PASS: '합격', FAIL: '불합격' }
const GRADE_COLOR: Record<string, string> = {
  PASS: 'bg-green-500/15 text-green-500',
  FAIL: 'bg-red-500/15 text-red-500',
}

function SubmissionCard({
  assignmentId,
  submissionId,
  currentUser,
  onBack,
  onEdit,
  onChanged,
  onDeleted,
}: {
  assignmentId: string
  submissionId: number
  currentUser: User | null
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

        {currentUser?.role === 'ADMIN' && (
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

function QuestionCard({
  questionId,
  currentUser,
  onBack,
  onChanged,
  onDeleted,
}: {
  questionId: number
  currentUser: User | null
  onBack: () => void
  onChanged?: () => void
  onDeleted?: () => void
}) {
  const toast = useToast()
  const confirm = useConfirm()
  const [question, setQuestion] = useState<AssignmentQuestion | null>(null)
  const [comments, setComments] = useState<AssignmentQuestionComment[]>([])
  const [loading, setLoading] = useState(true)
  const [replyContent, setReplyContent] = useState('')
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([getQuestion(questionId), listQuestionComments(questionId)])
      .then(([q, c]) => {
        setQuestion(q)
        setComments(c)
      })
      .finally(() => setLoading(false))
  }, [questionId])

  useEffect(() => {
    return realtimeHub.on('assignment_question_event', (data) => {
      if (data.question_id !== questionId) return
      Promise.all([getQuestion(questionId), listQuestionComments(questionId)])
        .then(([q, c]) => {
          setQuestion(q)
          setComments(c)
        })
        .catch(() => onDeleted?.())
    })
  }, [questionId])

  async function postReply() {
    if (!replyContent.trim()) return
    setPosting(true)
    try {
      const c = await createQuestionComment(questionId, replyContent)
      setComments((prev) => [...prev, c])
      setReplyContent('')
      setQuestion((prev) => (prev ? { ...prev, is_answered: true } : prev))
      onChanged?.()
    } catch (err: unknown) {
      toast(errorMessage(err), 'error')
    } finally {
      setPosting(false)
    }
  }

  async function deleteReply(commentId: number) {
    const confirmed = await confirm({
      message: '답변을 삭제하시겠습니까?',
      confirmLabel: '삭제',
      destructive: true,
    })
    if (!confirmed) return
    await deleteQuestionComment(commentId)
    setComments((prev) => {
      const next = prev.filter((c) => c.id !== commentId)
      setQuestion((q) => (q ? { ...q, is_answered: next.some((c) => c.author.role === 'ADMIN') } : q))
      return next
    })
    onChanged?.()
  }

  async function deleteThisQuestion() {
    const confirmed = await confirm({
      message: '질문을 삭제하시겠습니까?',
      confirmLabel: '삭제',
      destructive: true,
    })
    if (!confirmed) return
    await apiDeleteQuestion(questionId)
    onDeleted?.()
  }

  if (loading || !question) {
    return <div className="text-sm text-gray-400 text-center py-10">불러오는 중...</div>
  }

  const canDelete = !!currentUser && (currentUser.id === question.author.id || currentUser.role === 'ADMIN')
  const canDeleteComment = (c: AssignmentQuestionComment) =>
    !!currentUser && (currentUser.id === c.author.id || currentUser.role === 'ADMIN')

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition mb-3"
        >
          <ArrowLeft aria-hidden="true" className="size-3.5" />
          목록으로
        </button>

        <div className="flex items-center gap-2 mb-2">
          {question.is_answered && (
            <span className="text-xs badge-neutral px-1.5 py-0.5 rounded font-medium">
              답변됨
            </span>
          )}
          {canDelete && (
            <button onClick={deleteThisQuestion} className="ml-auto text-xs text-gray-400 hover:text-red-500 transition">
              삭제
            </button>
          )}
        </div>
        <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1">{question.title}</h2>
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
          <span className="font-medium text-gray-600 dark:text-gray-300">{question.author.name}</span>
          <span>·</span>
          <span>{toDate(question.created_at).toLocaleString('ko')}</span>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
          <RichTextEditor content={question.content} editable={false} />
        </div>

        <div className="border-t border-gray-200 dark:border-gray-800 mt-5 pt-4">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">답변 ({comments.length})</p>
          {comments.length === 0 ? (
            <p className="text-sm text-gray-400 mb-3">아직 답변이 없습니다.</p>
          ) : (
            <ul className="space-y-3 mb-3">
              {comments.map((c) => (
                <li key={c.id} className="border-b border-gray-100 dark:border-gray-800/60 pb-3 last:border-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                      {c.author.name}
                      {c.author.role === 'ADMIN' && (
                        <span className="text-[10px] badge-neutral px-1 py-0.5 rounded font-medium">
                          멘토
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{toDate(c.created_at).toLocaleString('ko')}</span>
                      {canDeleteComment(c) && (
                        <button
                          onClick={() => deleteReply(c.id)}
                          className="text-xs text-gray-400 hover:text-red-500 transition"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
                    {c.content}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {currentUser && (
        <div className="shrink-0 space-y-2 pt-3 border-t border-gray-200 dark:border-gray-800">
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="답변을 작성해보세요."
            rows={3}
            className="w-full bg-gray-50 dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200 text-sm rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-gray-500 transition placeholder-gray-400 dark:placeholder-gray-600"
          />
          <div className="flex items-center justify-end gap-3">
            <span className="text-xs text-gray-400 tabular-nums">{replyContent.length}자</span>
            <button
              onClick={postReply}
              disabled={posting}
              className="flex items-center gap-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-semibold px-4 py-1.5 rounded-lg hover:opacity-80 transition disabled:opacity-50"
            >
              <Pencil aria-hidden="true" className="size-3.5" />
              답변 작성
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AssignmentDetailPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const user = getStoredUser<User>()
  // 제출 현황(다른 사람의 제출물)은 관리자만 볼 수 있다. 일반 회원에게는
  // 탭 자체를 감추고, 목록 조회도 하지 않는다 (백엔드가 403을 준다).
  const isAdmin = user?.role === 'ADMIN'

  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [rightTab, setRightTab] = useState<'write' | 'list' | 'qna'>('write')
  const [mySubmission, setMySubmission] = useState<Submission | null>(null)
  const [submissions, setSubmissions] = useState<SubmissionListItem[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [file, setFile] = useState<UploadResult | null>(null)
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [editingOwn, setEditingOwn] = useState(false)
  const [listDetailId, setListDetailId] = useState<number | null>(null)

  const [questions, setQuestions] = useState<AssignmentQuestionListItem[]>([])
  const [questionView, setQuestionView] = useState<'list' | 'write' | 'detail'>('list')
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null)
  const [questionTitle, setQuestionTitle] = useState('')
  const [questionContent, setQuestionContent] = useState('')
  const [postingQuestion, setPostingQuestion] = useState(false)

  const [splitPercent, setSplitPercent] = useState(62)
  const containerRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)

  useEffect(() => {
    setLoading(true)
    setNotFound(false)
    setAssignment(null)
    setMySubmission(null)
    setSubmissions([])
    setQuestions([])
    setTitle('')
    setContent('')
    setFile(null)
    setRightTab('write')
    setEditingOwn(false)
    setListDetailId(null)
    setQuestionView('list')
    setSelectedQuestionId(null)
    setQuestionTitle('')
    setQuestionContent('')

    const requests: Promise<unknown>[] = [
      getAssignment(id).then((a) => {
        setAssignment(a)
        setTitle((prev) => prev || (user ? `${a.title}_${user.name} 제출` : ''))
      }),
      listQuestions(id).then(setQuestions),
    ]
    if (isAdmin) requests.push(listSubmissions(id).then(setSubmissions))
    if (user) {
      requests.push(
        getMySubmission(id).then((sub) => {
          if (sub) {
            setMySubmission(sub)
            setTitle(sub.title)
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
  }, [id, user?.id, isAdmin])

  function refreshSubmissions() {
    if (!isAdmin) return Promise.resolve()
    return listSubmissions(id).then(setSubmissions)
  }

  function refreshQuestions() {
    return listQuestions(id).then(setQuestions)
  }

  useEffect(() => {
    const offSub = realtimeHub.on('assignment_submission_event', (data) => {
      if (String(data.assignment_id) !== String(id)) return
      refreshSubmissions()
    })
    const offQuestion = realtimeHub.on('assignment_question_event', (data) => {
      if (String(data.assignment_id) !== String(id)) return
      refreshQuestions()
    })
    return () => {
      offSub()
      offQuestion()
    }
  }, [id])

  async function handleDelete() {
    const confirmed = await confirm({
      message: '과제를 삭제하시겠습니까?\n제출된 내용도 함께 삭제됩니다.',
      confirmLabel: '삭제',
      destructive: true,
    })
    if (!confirmed) return
    await deleteAssignment(id)
    router.push('/assignments')
  }

  async function save(isFinal: boolean) {
    setSubmitError('')
    setSaving(true)
    try {
      const result = await submitAssignment(id, {
        title,
        content,
        attachment: file,
        is_final: isFinal,
      })
      setMySubmission(result)
      if (isFinal) {
        setEditingOwn(false)
      } else {
        toast('임시 저장되었습니다.')
      }
      await refreshSubmissions()
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  async function postQuestion() {
    if (!questionTitle.trim() || !questionContent.trim()) return
    setPostingQuestion(true)
    try {
      const q = await createQuestion(id, questionTitle, questionContent)
      await refreshQuestions()
      setQuestionTitle('')
      setQuestionContent('')
      setSelectedQuestionId(q.id)
      setQuestionView('detail')
    } catch (err: unknown) {
      toast(errorMessage(err), 'error')
    } finally {
      setPostingQuestion(false)
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
  const showEditForm = !mySubmission?.is_final || editingOwn
  const submissionsEmptyMessage = '아직 제출한 사람이 없습니다.'

  return (
    <div ref={containerRef} className="flex h-full">
      {/* ── 가운데: 과제 내용 ── */}
      <div style={{ width: `${splitPercent}%` }} className="min-w-0 overflow-y-auto px-8 py-6">
        <span className="inline-block text-[10px] px-1.5 py-0.5 rounded-full font-medium badge-neutral mb-2">
          {assignment.track ? `${assignment.track.name} 트랙 전용` : '전체 과제'}
        </span>
        <div className="flex items-start justify-between gap-3 mb-1">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{assignment.title}</h1>
          {canManage && (
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => router.push(`/assignments/${id}/edit`)}
                className="text-xs text-gray-400 hover:text-gray-500 transition"
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
        <p className={`text-xs font-medium mb-5 ${closed ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}>
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
                    href={toDownloadUrl(f.url, f.filename)}
                    className="inline-flex items-center gap-1.5 text-sm text-gray-900 dark:text-white hover:underline"
                  >
                    <Download aria-hidden="true" className="size-3.5" />
                    {f.filename}
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
        role="separator"
        aria-orientation="vertical"
        aria-label="좌우 영역 너비 조절"
        className="w-1.5 shrink-0 cursor-col-resize bg-gray-100 dark:bg-[#0f0f0f] hover:bg-gray-300 dark:hover:bg-gray-700 flex items-center justify-center transition"
      >
        <GripVertical aria-hidden="true" className="size-3 text-gray-400" />
      </div>

      {/* ── 오른쪽: 제출 작성 / 제출 현황 / 질문 (전부 이 패널 안에서만 전환) ── */}
      <div style={{ width: `${100 - splitPercent}%` }} className="min-w-0 flex flex-col border-l border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <button
            onClick={() => setRightTab('write')}
            className={`text-sm font-medium transition ${
              rightTab === 'write'
                ? 'text-gray-900 dark:text-white border-b-2 border-gray-900 dark:border-white pb-0.5'
                : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            제출 작성
          </button>
          {isAdmin && (
            <button
              onClick={() => setRightTab('list')}
              className={`text-sm font-medium transition ${
                rightTab === 'list'
                  ? 'text-gray-900 dark:text-white border-b-2 border-gray-900 dark:border-white pb-0.5'
                  : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              제출 현황 ({submissions.length})
            </button>
          )}
          <button
            onClick={() => setRightTab('qna')}
            className={`text-sm font-medium transition ${
              rightTab === 'qna'
                ? 'text-gray-900 dark:text-white border-b-2 border-gray-900 dark:border-white pb-0.5'
                : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            질문 ({questions.length})
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          {!user ? (
            <p className="text-sm text-gray-400">로그인 후 이용 가능합니다.</p>
          ) : rightTab === 'list' && !isAdmin ? (
            <p className="text-sm text-gray-400">제출 현황은 관리자만 볼 수 있습니다.</p>
          ) : rightTab === 'write' ? (
            !showEditForm && mySubmission ? (
              <SubmissionCard
                assignmentId={id}
                submissionId={mySubmission.id}
                currentUser={user}
                onEdit={!closed ? () => setEditingOwn(true) : undefined}
                onChanged={refreshSubmissions}
                onDeleted={async () => {
                  setMySubmission(null)
                  setTitle(user ? `${assignment.title}_${user.name} 제출` : '')
                  setContent('')
                  setFile(null)
                  await refreshSubmissions()
                }}
              />
            ) : (
              <div className="flex flex-col h-full gap-3">
                {mySubmission?.is_final && (
                  <div className="flex items-center justify-between shrink-0">
                    <p className="text-sm text-green-500 inline-flex items-center gap-1.5"><Check aria-hidden="true" className="size-4 shrink-0" />이미 최종 제출했습니다. 마감 전까지는 다시 수정할 수 있습니다.</p>
                    <button
                      onClick={() => setEditingOwn(false)}
                      className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition shrink-0"
                    >
                      취소
                    </button>
                  </div>
                )}
                {notStarted ? (
                  <p className="text-sm text-gray-400">아직 제출 기간이 시작되지 않았습니다.</p>
                ) : closed && !mySubmission ? (
                  <p className="text-sm text-gray-400">제출 기간이 종료되었습니다.</p>
                ) : (
                  <>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="제목을 입력하세요"
                      disabled={!canSubmit}
                      className="w-full bg-white dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 font-semibold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 transition shrink-0 disabled:opacity-60"
                    />
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
                            className="btn-primary px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
                          >
                            최종 제출
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          ) : rightTab === 'list' ? (
            listDetailId !== null ? (
              <SubmissionCard
                assignmentId={id}
                submissionId={listDetailId}
                currentUser={user}
                onBack={() => setListDetailId(null)}
                onChanged={refreshSubmissions}
                onDeleted={async () => {
                  setListDetailId(null)
                  await refreshSubmissions()
                }}
              />
            ) : submissions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">{submissionsEmptyMessage}</p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800/60">
                {submissions.map((s) => (
                  <li
                    key={s.id}
                    onClick={() => setListDetailId(s.id)}
                    className="py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.04] transition -mx-4 px-4"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="shrink-0 text-xs badge-neutral px-1.5 py-0.5 rounded font-medium">
                        최종제출
                      </span>
                      {s.grade && (
                        <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded font-medium ${GRADE_COLOR[s.grade]}`}>
                          {GRADE_LABEL[s.grade]}
                        </span>
                      )}
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{s.title}</span>
                      {s.comment_count > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-xs text-gray-500 dark:text-gray-400 shrink-0"><MessageSquare aria-hidden="true" className="size-3" />{s.comment_count}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span className="truncate">{s.user.name}</span>
                      {s.user.plan && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="truncate">{s.user.plan.name}</span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span className="shrink-0 tabular-nums ml-auto">
                        {formatTimestamp(s.submitted_at ?? s.created_at)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )
          ) : questionView === 'detail' && selectedQuestionId !== null ? (
            <QuestionCard
              questionId={selectedQuestionId}
              currentUser={user}
              onBack={() => {
                setQuestionView('list')
                setSelectedQuestionId(null)
              }}
              onChanged={refreshQuestions}
              onDeleted={() => {
                setQuestionView('list')
                setSelectedQuestionId(null)
                refreshQuestions()
              }}
            />
          ) : questionView === 'write' ? (
            <div className="flex flex-col h-full gap-3">
              <button
                onClick={() => setQuestionView('list')}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition shrink-0 self-start"
              >
                <ArrowLeft aria-hidden="true" className="size-3.5" />
                목록으로
              </button>
              <input
                value={questionTitle}
                onChange={(e) => setQuestionTitle(e.target.value)}
                placeholder="질문 제목을 입력하세요"
                className="w-full bg-white dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 font-semibold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 transition shrink-0"
              />
              <RichTextEditor
                content={questionContent}
                onChange={setQuestionContent}
                placeholder="'/'를 입력하여 질문을 작성해보세요."
                fullHeight
              />
              <div className="flex justify-end shrink-0">
                <button
                  onClick={postQuestion}
                  disabled={postingQuestion}
                  className="flex items-center gap-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-semibold px-4 py-1.5 rounded-lg hover:opacity-80 transition disabled:opacity-50"
                >
                  <Pencil aria-hidden="true" className="size-3.5" />
                  질문 등록
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="flex justify-end shrink-0 mb-2">
                <button
                  onClick={() => {
                    setQuestionTitle('')
                    setQuestionContent('')
                    setQuestionView('write')
                  }}
                  className="flex items-center gap-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-80 transition"
                >
                  <Pencil aria-hidden="true" className="size-3.5" />
                  질문 작성
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                {questions.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-10">아직 질문이 없습니다.</p>
                ) : (
                  <ul className="divide-y divide-gray-100 dark:divide-gray-800/60">
                    {questions.map((q) => (
                      <li
                        key={q.id}
                        onClick={() => {
                          setSelectedQuestionId(q.id)
                          setQuestionView('detail')
                        }}
                        className="py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.04] transition -mx-1 px-1"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {q.is_answered && (
                            <span className="text-xs bg-green-500/15 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded font-medium shrink-0">
                              답변됨
                            </span>
                          )}
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{q.title}</span>
                          {q.comment_count > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-xs text-gray-500 dark:text-gray-400 shrink-0"><MessageSquare aria-hidden="true" className="size-3" />{q.comment_count}</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span>{q.author.name}</span>
                          <span>{toDate(q.created_at).toLocaleString('ko')}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
