import { api } from './client'
import type { User } from '../types'

export interface SignupPayload {
  name: string
  student_id: string
  email: string
  password: string
  generation: number
  part: string
}

export function login(email: string, password: string) {
  return api.login(email, password)
}

export function signup(data: SignupPayload) {
  return api.post<User>('/api/auth/signup', data)
}

export function getMe() {
  return api.get<User>('/api/auth/me')
}
