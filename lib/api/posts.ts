import { api } from './client'
import type { Comment, Post, UploadResult } from '../types'

export interface ListPostsParams {
  board_type?: string
  search?: string
  limit?: number
}

export interface PostPayload {
  title: string
  content: string
  board_type: string
  attachments?: UploadResult[]
}

export interface PostUpdatePayload {
  title?: string
  content?: string
  attachments?: UploadResult[]
}

function buildQuery(params: ListPostsParams): string {
  const p = new URLSearchParams()
  if (params.board_type) p.set('board_type', params.board_type)
  if (params.search) p.set('search', params.search)
  if (params.limit) p.set('limit', String(params.limit))
  return p.toString()
}

export function listPosts(params: ListPostsParams = {}) {
  return api.get<Post[]>(`/api/posts?${buildQuery(params)}`)
}

export function getPost(id: number | string) {
  return api.get<Post>(`/api/posts/${id}`)
}

export function createPost(data: PostPayload) {
  return api.post<Post>('/api/posts', data)
}

export function updatePost(id: number | string, data: PostUpdatePayload) {
  return api.put<Post>(`/api/posts/${id}`, data)
}

export function deletePost(id: number | string) {
  return api.del(`/api/posts/${id}`)
}

export function listComments(postId: number | string) {
  return api.get<Comment[]>(`/api/posts/${postId}/comments`)
}

export function createComment(postId: number | string, content: string) {
  return api.post<Comment>(`/api/posts/${postId}/comments`, { content })
}

export function deleteComment(commentId: number | string) {
  return api.del(`/api/comments/${commentId}`)
}

export function adoptComment(postId: number | string, commentId: number | string) {
  return api.post<Comment>(`/api/posts/${postId}/adopt/${commentId}`, {})
}
