import { api } from './client'
import type { Track } from '../types'

export interface TrackPayload {
  key: string
  name: string
  order?: number
}

export interface TrackUpdatePayload {
  name?: string
  order?: number
}

export function listTracks() {
  return api.get<Track[]>('/api/tracks')
}

export function createTrack(data: TrackPayload) {
  return api.post<Track>('/api/tracks', data)
}

export function updateTrack(id: number, data: TrackUpdatePayload) {
  return api.put<Track>(`/api/tracks/${id}`, data)
}

export function deleteTrack(id: number) {
  return api.del(`/api/tracks/${id}`)
}
