import { api } from './client'
import type { User } from '../types'

export function listUsers() {
  return api.get<User[]>('/api/admin/users')
}

export function approveUser(userId: number) {
  return api.post<User>(`/api/admin/users/${userId}/approve`, {})
}

export function updateUserRole(userId: number, role: 'MEMBER' | 'ADMIN') {
  return api.put<User>(`/api/admin/users/${userId}/role`, { role })
}

export function deleteUser(userId: number) {
  return api.del(`/api/admin/users/${userId}`)
}
