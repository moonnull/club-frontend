import { api } from './client'
import type { Notification } from '../types'

/** 한 번에 받아오는 알림 개수. 백엔드 기본값과 맞춘다. */
export const NOTIFICATION_PAGE_SIZE = 30

/**
 * 최신순 알림. beforeId를 주면 그보다 이전 것만 받는다("더 보기").
 * offset이 아니라 id 커서를 쓰는 이유는 백엔드 주석 참고 — 보고 있는 사이에
 * 새 알림이 오면 offset은 밀려서 같은 알림이 두 번 보인다.
 */
export function listNotifications(beforeId?: number) {
  const query = beforeId ? `?before_id=${beforeId}` : ''
  return api.get<Notification[]>(`/api/notifications${query}`)
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

export function deleteNotification(id: number) {
  return api.del(`/api/notifications/${id}`)
}
