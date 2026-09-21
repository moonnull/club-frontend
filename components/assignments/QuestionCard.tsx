'use client'
import { useEffect, useState } from 'react'
import {
  createQuestionComment,
  deleteQuestion as apiDeleteQuestion,
  deleteQuestionComment,
  getQuestion,
  listQuestionComments,
} from '@/lib/api/assignments'
import { isAssignmentStaff } from '@/lib/role'
import { realtimeHub } from '@/lib/ws'
import RichTextEditor from '@/components/RichTextEditor'
import { toDate } from '@/lib/formatDeadline'
import type { AssignmentQuestion, AssignmentQuestionComment, User } from '@/lib/types'
import { errorMessage, useToast } from '@/components/Toast'
import { useConfirm } from '@/components/ConfirmDialog'
import { ArrowLeft, Pencil } from 'lucide-react'

/**
 * 질문 하나를 펼쳐 보는 카드. 질문 본문과 거기 달린 답변을 다룬다.
 */
export default function QuestionCard({
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
      setQuestion((q) => (q ? { ...q, is_answered: next.some((c) => isAssignmentStaff(c.author)) } : q))
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
                      {isAssignmentStaff(c.author) && (
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
