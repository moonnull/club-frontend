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

export interface PostRow {
  id: number
  title: string
  board_type: string
  board_name: string
  created_at: string
  comment_count: number
  author_name: string
}

export interface AssignmentRow {
  id: number
  title: string
  plan_name: string | null
  track_name: string | null
  start_at: string
  end_at: string
  submission_count: number
  author_name: string
}

export interface UsageSection {
  used: number | null
  limit: number | null
}

export interface StorageUsage {
  database: {
    used_bytes: number
    limit_bytes: number | null
    tables: { name: string; bytes: number }[]
  }
  /** Cloudinary 미설정이거나 조회 실패 시 null */
  cloudinary: {
    plan: string | null
    credits: UsageSection
    storage: UsageSection
    bandwidth: UsageSection
  } | null
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

export function listAllPosts(limit = 50, offset = 0) {
  return api.get<RowPage<PostRow>>(`${BASE}/posts?limit=${limit}&offset=${offset}`)
}

export function deletePostsByIds(ids: number[]) {
  return api.post<CleanupResult>(`${BASE}/posts/delete`, { ids })
}

export function listAllAssignments(limit = 50, offset = 0) {
  return api.get<RowPage<AssignmentRow>>(`${BASE}/assignments?limit=${limit}&offset=${offset}`)
}

export function deleteAssignmentsByIds(ids: number[]) {
  return api.post<CleanupResult>(`${BASE}/assignments/delete`, { ids })
}

export function getStorageUsage() {
  return api.get<StorageUsage>(`${BASE}/storage-usage`)
}
