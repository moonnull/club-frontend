import { api } from './client'
import type { AssignmentAssignees, AssignmentProgress, Notification, User } from '../types'

export function listUsers() {
  return api.get<User[]>('/api/admin/users')
}

export function approveUser(userId: number) {
  return api.post<User>(`/api/admin/users/${userId}/approve`, {})
}

export function updateUserRole(userId: number, role: User['role']) {
  return api.put<User>(`/api/admin/users/${userId}/role`, { role })
}

export function assignUserTracks(userId: number, trackIds: number[]) {
  return api.put<User>(`/api/admin/users/${userId}/track`, { track_ids: trackIds })
}

export function assignUserPlan(userId: number, planId: number | null) {
  return api.put<User>(`/api/admin/users/${userId}/plan`, { plan_id: planId })
}

export function updateUserPenalty(userId: number, cautionCount: number, warningCount: number) {
  return api.put<User>(`/api/admin/users/${userId}/penalty`, {
    caution_count: cautionCount,
    warning_count: warningCount,
  })
}

export function deleteUser(userId: number) {
  return api.del(`/api/admin/users/${userId}`)
}

export function resetUserPassword(userId: number) {
  return api.post<{ temporary_password: string }>(`/api/admin/users/${userId}/reset-password`, {})
}

export function sendNotification(userId: number, message: string) {
  return api.post<Notification>(`/api/admin/users/${userId}/notifications`, { message })
}

export interface BulkAssignResult {
  updated: number
}

/** 여러 회원에게 같은 플랜을 한 번에 배정한다. planId가 null이면 배정 해제. */
export function assignPlanToUsers(userIds: number[], planId: number | null) {
  return api.post<BulkAssignResult>('/api/admin/users/bulk/plan', {
    user_ids: userIds,
    plan_id: planId,
  })
}

/** 여러 회원에게 같은 트랙 구성을 한 번에 배정한다 (기존 구성은 대체된다). */
export function assignTracksToUsers(userIds: number[], trackIds: number[]) {
  return api.post<BulkAssignResult>('/api/admin/users/bulk/tracks', {
    user_ids: userIds,
    track_ids: trackIds,
  })
}

/** 백엔드 NOTIFICATION_MESSAGE_MAX와 맞춘다. 화면에서 미리 막아 서버까지 갔다 오지 않게 한다. */
export const NOTIFICATION_MESSAGE_MAX = 500

export interface BulkNotificationResult {
  sent: number
  /** 승인 대기 중이라 보내지 않은 수 (로그인할 수 없어 볼 수 없다) */
  skipped_inactive: number
}

/**
 * 선택한 회원들에게 같은 알림을 보낸다.
 * link는 사이트 안의 경로(/로 시작)만 된다 — 알림을 누르면 그대로 이동하기 때문이다.
 */
export function sendBulkNotification(userIds: number[], message: string, link?: string) {
  return api.post<BulkNotificationResult>('/api/admin/users/bulk/notifications', {
    user_ids: userIds,
    message,
    ...(link ? { link } : {}),
  })
}

/** 과제별 제출 현황 (대상자·제출·임시 저장·미제출 수). 마감이 늦은 것부터. */
export function listAssignmentProgress() {
  return api.get<AssignmentProgress[]>('/api/admin/assignments/progress')
}

/** 한 과제의 대상자별 제출 상태. 안 낸 사람이 위로 온다. */
export function getAssignmentAssignees(assignmentId: number) {
  return api.get<AssignmentAssignees>(`/api/admin/assignments/${assignmentId}/assignees`)
}
