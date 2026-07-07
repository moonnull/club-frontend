import { api } from './client'
import type { BoardCategory } from '../types'

export interface BoardCategoryPayload {
  key: string
  name: string
  admin_only: boolean
  order?: number
}

export interface BoardCategoryUpdatePayload {
  name?: string
  admin_only?: boolean
  order?: number
}

export function listBoards() {
  return api.get<BoardCategory[]>('/api/boards')
}

export function createBoard(data: BoardCategoryPayload) {
  return api.post<BoardCategory>('/api/boards', data)
}

export function updateBoard(id: number, data: BoardCategoryUpdatePayload) {
  return api.put<BoardCategory>(`/api/boards/${id}`, data)
}

export function deleteBoard(id: number) {
  return api.del(`/api/boards/${id}`)
}
