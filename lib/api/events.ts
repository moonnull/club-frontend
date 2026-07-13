import { api } from './client'
import type { Attendance, AttendanceStats, Event } from '../types'

export interface EventPayload {
  title: string
  description?: string | null
  event_date: string
  location?: string | null
}

export function listEvents(upcomingOnly: boolean, limit?: number) {
  const limitParam = limit ? `&limit=${limit}` : ''
  return api.get<Event[]>(`/api/events?upcoming_only=${upcomingOnly}${limitParam}`)
}

export function getEvent(id: number | string) {
  return api.get<Event>(`/api/events/${id}`)
}

export function createEvent(data: EventPayload) {
  return api.post<Event>('/api/events', data)
}

export function updateEvent(id: number | string, data: Partial<EventPayload>) {
  return api.put<Event>(`/api/events/${id}`, data)
}

export function deleteEvent(id: number | string) {
  return api.del(`/api/events/${id}`)
}

export function checkIn(eventId: number | string) {
  return api.post(`/api/events/${eventId}/attendance`, {})
}

export function listAttendance(eventId: number | string) {
  return api.get<Attendance[]>(`/api/events/${eventId}/attendance`)
}

export function myAttendanceStats() {
  return api.get<AttendanceStats>('/api/events/me/attendance-stats')
}
