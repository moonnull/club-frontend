import { api } from './client'
import type {
  Assignment,
  AssignmentListItem,
  AssignmentQuestion,
  AssignmentQuestionComment,
  AssignmentQuestionListItem,
  Submission,
  SubmissionComment,
  SubmissionListItem,
  TrackAssignmentSummary,
  UploadResult,
} from '../types'

export interface AssignmentPayload {
  title: string
  content: string
  start_at: string
  end_at: string
  track_id?: number | null
  /** null이면 플랜과 무관한 공통 과제 */
  plan_id?: number | null
  files: UploadResult[]
}

export interface AssignmentUpdatePayload {
  title?: string
  content?: string
  start_at?: string
  end_at?: string
  track_id?: number | null
  plan_id?: number | null
  files?: UploadResult[]
}

export interface SubmissionPayload {
  title: string
  content: string
  attachment: UploadResult | null
  is_final: boolean
}

/** 과제 목록을 받아올 범위. 화면마다 필요한 만큼만 요청한다. */
export interface AssignmentQuery {
  /** 이 트랙의 과제만 (트랙 상세 화면) */
  trackId?: number
  /** 이 시각 이전에 시작한 것만 (ISO 문자열) */
  startsBefore?: string
  /** 이 시각 이후에 끝나는 것만 (ISO 문자열) */
  endsAfter?: string
  limit?: number
  offset?: number
}

export function listAssignments(query: AssignmentQuery = {}) {
  const params = new URLSearchParams()
  if (query.trackId !== undefined) params.set('track_id', String(query.trackId))
  if (query.startsBefore) params.set('starts_before', query.startsBefore)
  if (query.endsAfter) params.set('ends_after', query.endsAfter)
  if (query.limit !== undefined) params.set('limit', String(query.limit))
  if (query.offset) params.set('offset', String(query.offset))
  const qs = params.toString()
  return api.get<AssignmentListItem[]>(`/api/assignments${qs ? `?${qs}` : ''}`)
}

/** 트랙별 집계. 트랙 목록 화면이 전체 과제를 받지 않아도 되게 한다. */
export function getTrackSummaries() {
  return api.get<TrackAssignmentSummary[]>('/api/assignments/summary')
}

export function getAssignment(id: number | string) {
  return api.get<Assignment>(`/api/assignments/${id}`)
}

export function createAssignment(data: AssignmentPayload) {
  return api.post<Assignment>('/api/assignments', data)
}

export function updateAssignment(id: number | string, data: AssignmentUpdatePayload) {
  return api.put<Assignment>(`/api/assignments/${id}`, data)
}

export function deleteAssignment(id: number | string) {
  return api.del(`/api/assignments/${id}`)
}

export function getMySubmission(assignmentId: number | string) {
  return api.get<Submission | null>(`/api/assignments/${assignmentId}/submission`)
}

export function submitAssignment(assignmentId: number | string, data: SubmissionPayload) {
  return api.put<Submission>(`/api/assignments/${assignmentId}/submission`, data)
}

export function listSubmissions(assignmentId: number | string) {
  return api.get<SubmissionListItem[]>(`/api/assignments/${assignmentId}/submissions`)
}

export function getSubmission(assignmentId: number | string, submissionId: number | string) {
  return api.get<Submission>(`/api/assignments/${assignmentId}/submissions/${submissionId}`)
}

export function deleteSubmission(assignmentId: number | string, submissionId: number | string) {
  return api.del(`/api/assignments/${assignmentId}/submissions/${submissionId}`)
}

export function gradeSubmission(
  assignmentId: number | string,
  submissionId: number | string,
  grade: 'PASS' | 'FAIL' | null
) {
  return api.put<Submission>(`/api/assignments/${assignmentId}/submissions/${submissionId}/grade`, { grade })
}

export function listSubmissionComments(assignmentId: number | string, submissionId: number | string) {
  return api.get<SubmissionComment[]>(`/api/assignments/${assignmentId}/submissions/${submissionId}/comments`)
}

export function createSubmissionComment(
  assignmentId: number | string,
  submissionId: number | string,
  content: string,
  attachment: UploadResult | null
) {
  return api.post<SubmissionComment>(`/api/assignments/${assignmentId}/submissions/${submissionId}/comments`, {
    content,
    attachment,
  })
}

export function deleteSubmissionComment(commentId: number | string) {
  return api.del(`/api/submission-comments/${commentId}`)
}

export function listQuestions(assignmentId: number | string) {
  return api.get<AssignmentQuestionListItem[]>(`/api/assignments/${assignmentId}/questions`)
}

export function getQuestion(questionId: number | string) {
  return api.get<AssignmentQuestion>(`/api/assignment-questions/${questionId}`)
}

export function createQuestion(assignmentId: number | string, title: string, content: string) {
  return api.post<AssignmentQuestion>(`/api/assignments/${assignmentId}/questions`, { title, content })
}

export function deleteQuestion(questionId: number | string) {
  return api.del(`/api/assignment-questions/${questionId}`)
}

export function listQuestionComments(questionId: number | string) {
  return api.get<AssignmentQuestionComment[]>(`/api/assignment-questions/${questionId}/comments`)
}

export function createQuestionComment(questionId: number | string, content: string) {
  return api.post<AssignmentQuestionComment>(`/api/assignment-questions/${questionId}/comments`, { content })
}

export function deleteQuestionComment(commentId: number | string) {
  return api.del(`/api/assignment-question-comments/${commentId}`)
}
