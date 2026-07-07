import { api } from './client'
import type { Project } from '../types'

export interface ListProjectsParams {
  generation?: string
  tech?: string
}

export interface ProjectPayload {
  title: string
  description: string | null
  generation: number | null
  tech_stack: string | null
  github_url: string | null
  demo_url: string | null
  thumbnail_url: string | null
}

function buildQuery(params: ListProjectsParams): string {
  const p = new URLSearchParams()
  if (params.generation) p.set('generation', params.generation)
  if (params.tech) p.set('tech', params.tech)
  return p.toString()
}

export function listProjects(params: ListProjectsParams = {}) {
  return api.get<Project[]>(`/api/projects?${buildQuery(params)}`)
}

export function getProject(id: number | string) {
  return api.get<Project>(`/api/projects/${id}`)
}

export function createProject(data: ProjectPayload) {
  return api.post<Project>('/api/projects', data)
}

export function updateProject(id: number | string, data: Partial<ProjectPayload>) {
  return api.put<Project>(`/api/projects/${id}`, data)
}

export function deleteProject(id: number | string) {
  return api.del(`/api/projects/${id}`)
}
