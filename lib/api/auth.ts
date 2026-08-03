import { api } from './client'
import type { User } from '../types'

export interface SignupPayload {
  name: string
  student_id: string
  email: string
  password: string
  generation: number
  part: string
  security_question: string
  security_answer: string
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

export function forgotPassword(email: string) {
  return api.post<{ message: string }>('/api/auth/forgot-password', { email })
}

export function resetPassword(token: string, newPassword: string) {
  return api.post<{ message: string }>('/api/auth/reset-password', { token, new_password: newPassword })
}

export function getSecurityQuestion(email: string) {
  return api.post<{ question: string | null }>('/api/auth/security-question', { email })
}

export function verifySecurityAnswer(email: string, answer: string) {
  return api.post<{ reset_token: string }>('/api/auth/verify-security-answer', { email, answer })
}

export interface UpdateProfilePayload {
  name?: string
  password?: string
  security_question?: string
  security_answer?: string
}

export function updateProfile(data: UpdateProfilePayload) {
  return api.put<User>('/api/auth/me', data)
}
