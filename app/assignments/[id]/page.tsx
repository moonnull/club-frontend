'use client'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { api, getStoredUser } from '@/lib/api'
import RichTextEditor from '@/components/RichTextEditor'
import { formatDeadline, isPastDeadline } from '@/lib/formatDeadline'
import type { Assignment, SubmissionListItem, User } from '@/lib/types'

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
  const [submissions, setSubmissions] = useState<SubmissionListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    api
      .get<Assignment>(`/api/assignments/${id}`)
      .then((a) => {
        setAssignment(a)
        return api.get<SubmissionListItem[]>(`/api/assignments/${id}/submissions`)
      })
      .then(setSubmissions)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  async function handleDelete() {
    if (!confirm('과제를 삭제하시겠습니까? 제출된 내용도 함께 삭제됩니다.')) return
    await api.del(`/api/assignments/${id}`)
    router.push('/assignments')
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
  const closed = isPastDeadline(assignment.end_at)

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
      </div>

      {/* 제출 현황 패널 */}
      <div className="w-96 shrink-0 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">제출 현황 ({submissions.length})</p>
          {user && (
            <button
              onClick={() => router.push(`/assignments/${id}/submit`)}
              className="flex items-center gap-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-medium transition"
            >
              ✏️ 과제 작성
            </button>
          )}
        </div>

        {submissions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">아직 제출한 사람이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800/60 max-h-[70vh] overflow-y-auto">
            {submissions.map((s) => (
              <li
                key={s.id}
                onClick={() => router.push(`/assignments/${id}/submissions/${s.id}`)}
                className="px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#222] transition"
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
                    <span className="text-xs text-indigo-500 dark:text-indigo-400 shrink-0">
                      💬{s.comment_count}
                    </span>
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
  )
}
