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
