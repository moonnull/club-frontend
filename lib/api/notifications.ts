import { api } from './client'
import type { Notification } from '../types'

export function listNotifications() {
  return api.get<Notification[]>('/api/notifications')
}

export function unreadCount() {
  return api.get<{ count: number }>('/api/notifications/unread-count')
}

export function markNotificationRead(id: number) {
  return api.post<Notification>(`/api/notifications/${id}/read`, {})
}

export function markAllNotificationsRead() {
  return api.post<void>('/api/notifications/read-all', {})
}
