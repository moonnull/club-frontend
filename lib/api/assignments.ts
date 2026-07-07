import { api } from './client'
import type {
  Assignment,
  AssignmentListItem,
  AssignmentQuestion,
  Submission,
  SubmissionComment,
  SubmissionListItem,
  UploadResult,
} from '../types'

export interface AssignmentPayload {
  title: string
  content: string
  start_at: string
  end_at: string
  files: UploadResult[]
}

export interface AssignmentUpdatePayload {
  title?: string
  content?: string
  start_at?: string
  end_at?: string
  files?: UploadResult[]
}

export interface SubmissionPayload {
  title: string
  content: string
  attachment: UploadResult | null
  is_final: boolean
}

export function listAssignments() {
  return api.get<AssignmentListItem[]>('/api/assignments')
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
  return api.get<AssignmentQuestion[]>(`/api/assignments/${assignmentId}/questions`)
}

export function createQuestion(assignmentId: number | string, content: string) {
  return api.post<AssignmentQuestion>(`/api/assignments/${assignmentId}/questions`, { content })
}

export function deleteQuestion(questionId: number | string) {
  return api.del(`/api/assignment-questions/${questionId}`)
}
