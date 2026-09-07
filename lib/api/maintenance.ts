import { api } from './client'

export interface StorageStats {
  tables: Record<string, number>
}

export interface OrphanFile {
  public_id: string
  resource_type: string
  bytes: number
  created_at: string
}

export interface OrphanFileList {
  files: OrphanFile[]
  total_bytes: number
  min_age_days: number
}

export interface MaintenanceNotification {
  id: number
  message: string
  link: string | null
  created_at: string
}

export interface NotificationList {
  notifications: MaintenanceNotification[]
  total: number
}

export interface CleanupResult {
  deleted: number
  failed: number
}

const BASE = '/api/admin/maintenance'

export function getStorageStats() {
  return api.get<StorageStats>(`${BASE}/stats`)
}

export function listOrphanFiles(minAgeDays?: number) {
  const q = minAgeDays === undefined ? '' : `?min_age_days=${minAgeDays}`
  return api.get<OrphanFileList>(`${BASE}/orphan-files${q}`)
}

export function cleanupOrphanFiles(minAgeDays?: number) {
  const q = minAgeDays === undefined ? '' : `?min_age_days=${minAgeDays}`
  return api.post<CleanupResult>(`${BASE}/orphan-files/cleanup${q}`, {})
}

export function listDeadNotifications() {
  return api.get<NotificationList>(`${BASE}/dead-notifications`)
}

export function cleanupDeadNotifications() {
  return api.post<CleanupResult>(`${BASE}/dead-notifications/cleanup`, {})
}

export function listOldNotifications(days: number) {
  return api.get<NotificationList>(`${BASE}/old-notifications?days=${days}`)
}

export function cleanupOldNotifications(days: number) {
  return api.post<CleanupResult>(`${BASE}/old-notifications/cleanup?days=${days}`, {})
}

/** 현황에서 직접 확인·선택 삭제하는 행 (알림/캘린더) */
export interface NotificationRow {
  id: number
  message: string
  link: string | null
  is_read: boolean
  created_at: string
  recipient_name: string
}

export interface CalendarRow {
  id: number
  title: string
  item_date: string
  is_done: boolean
  author_name: string
}

export interface RowPage<T> {
  rows: T[]
  total: number
}

export function listAllNotifications(limit = 50, offset = 0) {
  return api.get<RowPage<NotificationRow>>(`${BASE}/notifications?limit=${limit}&offset=${offset}`)
}

export function deleteNotificationsByIds(ids: number[]) {
  return api.post<CleanupResult>(`${BASE}/notifications/delete`, { ids })
}

export function listAllCalendarItems(limit = 50, offset = 0) {
  return api.get<RowPage<CalendarRow>>(`${BASE}/calendar-items?limit=${limit}&offset=${offset}`)
}

export function deleteCalendarItemsByIds(ids: number[]) {
  return api.post<CleanupResult>(`${BASE}/calendar-items/delete`, { ids })
}
