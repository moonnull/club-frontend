'use client'
import { useState } from 'react'
import { updateProfile } from '@/lib/api/auth'
import { saveAuth, getStoredUser } from '@/lib/session'
import type { User } from '@/lib/types'

export default function ProfilePage() {
  const me = getStoredUser<User>()
  const [name, setName] = useState(me?.name ?? '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [securityQuestion, setSecurityQuestion] = useState('')
  const [securityAnswer, setSecurityAnswer] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  if (!me) return null

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (password && password !== confirmPassword) {
      setError('새 비밀번호가 일치하지 않습니다.')
      return
    }
    if ((securityQuestion && !securityAnswer) || (!securityQuestion && securityAnswer)) {
      setError('보안 질문과 답변을 함께 입력해주세요.')
      return
    }

    const payload: {
      name?: string
      password?: string
      security_question?: string
      security_answer?: string
    } = {}
    if (name.trim() && name.trim() !== me!.name) payload.name = name.trim()
    if (password) payload.password = password
    if (securityQuestion && securityAnswer) {
      payload.security_question = securityQuestion
      payload.security_answer = securityAnswer
    }

    if (Object.keys(payload).length === 0) {
      setError('변경할 내용이 없습니다.')
      return
    }

    setLoading(true)
    try {
      const updated = await updateProfile(payload)
      saveAuth(localStorage.getItem('token') ?? '', updated)
      setPassword('')
      setConfirmPassword('')
      setSecurityQuestion('')
      setSecurityAnswer('')
      setSuccess('회원정보가 수정되었습니다.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">회원정보 수정</h1>

      <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-xl p-6">
        <div className="mb-5 pb-5 border-b border-gray-100 dark:border-gray-800 text-sm text-gray-400 space-y-1">
          <p>이메일: {me.email}</p>
          <p>학번: {me.student_id}</p>
          <p>{me.generation}기 · {me.part}</p>
          <p>트랙: {me.track ? me.track.name : '미배정 (관리자에게 문의해주세요)'}</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              이름
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] text-gray-900 dark:text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              새 비밀번호 (변경하려면 입력)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={4}
              className="w-full bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] text-gray-900 dark:text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            />
          </div>
          {password && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                새 비밀번호 확인
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={4}
                className="w-full bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] text-gray-900 dark:text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
              />
            </div>
          )}

          <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 mt-4">
              보안 질문 (비밀번호를 잊었을 때 본인 확인용)
            </p>
            <p className="text-xs text-gray-400 mb-3">
              {me.has_security_question
                ? '✓ 설정되어 있습니다. 변경하려면 아래에 새로 입력해주세요.'
                : '설정되지 않았습니다. 비밀번호를 잊으면 복구할 수 없으니 아래에서 설정해주세요.'}
            </p>
            <div className="space-y-2">
              <input
                value={securityQuestion}
                onChange={(e) => setSecurityQuestion(e.target.value)}
                placeholder="새 보안 질문 (예: 어릴 적 별명은?)"
                className="w-full bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
              />
              <input
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                placeholder="새 보안 질문 답변"
                className="w-full bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {success && <p className="text-green-500 text-sm">{success}</p>}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition"
            >
              {loading ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
