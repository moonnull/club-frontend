import { api } from './client'
import type { User } from '../types'

export interface SignupPayload {
  name: string
  student_id: string
  email: string
  password: string
  generation: number
  /** 가입할 때 본인이 고르는 플랜. 이후 변경은 관리자만 할 수 있다. 미선택이면 null. */
  plan_id: number | null
  /** 가입할 때 본인이 고르는 트랙(과정). 여러 개를 함께 수강할 수 있다. */
  track_ids: number[]
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
  /** 비밀번호·보안 질문을 바꿀 때 서버가 요구하는 현재 비밀번호 */
  current_password?: string
}

export function updateProfile(data: UpdateProfilePayload) {
  return api.put<User>('/api/auth/me', data)
}
