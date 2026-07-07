import { api } from './client'
import type { UploadResult } from '../types'

export function uploadFile(file: File) {
  return api.upload<UploadResult>('/api/uploads', file)
}
