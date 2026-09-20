import { api } from './client'
import type { Notification, User } from '../types'

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
