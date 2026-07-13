import { api } from './client'
import type { CalendarItem } from '../types'

export interface CalendarItemPayload {
  title: string
  memo?: string | null
  item_date: string
}

export interface CalendarItemUpdatePayload {
  title?: string
  memo?: string | null
  item_date?: string
  is_done?: boolean
}

export function listCalendarItems(start: string, end: string) {
  return api.get<CalendarItem[]>(`/api/calendar-items?start=${start}&end=${end}`)
}

export function createCalendarItem(data: CalendarItemPayload) {
  return api.post<CalendarItem>('/api/calendar-items', data)
}

export function updateCalendarItem(id: number | string, data: CalendarItemUpdatePayload) {
  return api.put<CalendarItem>(`/api/calendar-items/${id}`, data)
}

export function deleteCalendarItem(id: number | string) {
  return api.del(`/api/calendar-items/${id}`)
}
