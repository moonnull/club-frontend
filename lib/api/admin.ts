import { api } from './client'
import type { Notification, User } from '../types'

export function listUsers() {
  return api.get<User[]>('/api/admin/users')
}

export function approveUser(userId: number) {
  return api.post<User>(`/api/admin/users/${userId}/approve`, {})
}

export function updateUserRole(userId: number, role: 'MEMBER' | 'ADMIN') {
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
