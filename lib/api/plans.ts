import { api } from './client'
import type { Plan } from '../types'

export interface PlanPayload {
  key: string
  name: string
  order?: number
}

export interface PlanUpdatePayload {
  name?: string
  order?: number
}

export function listPlans() {
  return api.get<Plan[]>('/api/plans')
}

export function createPlan(data: PlanPayload) {
  return api.post<Plan>('/api/plans', data)
}

export function updatePlan(id: number, data: PlanUpdatePayload) {
  return api.put<Plan>(`/api/plans/${id}`, data)
}

export function deletePlan(id: number) {
  return api.del(`/api/plans/${id}`)
}
