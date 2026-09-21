'use client'
import { errorMessage } from '@/components/Toast'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateProfile } from '@/lib/api/auth'
import { clearAuth, saveAuth, getStoredUser } from '@/lib/session'
import type { User } from '@/lib/types'

export default function ProfilePage() {
  const router = useRouter()
  const me = getStoredUser<User>()
  const [name, setName] = useState(me?.name ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
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
      current_password?: string
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

    // 비밀번호와 보안 질문은 계정을 통째로 넘길 수 있는 항목이라 서버가 현재
    // 비밀번호를 요구한다. 이름만 바꿀 때는 묻지 않는다.
    const needsReauth = Boolean(payload.password || payload.security_question)
    if (needsReauth && !currentPassword) {
      setError('현재 비밀번호를 입력해주세요.')
      return
    }
    if (needsReauth) payload.current_password = currentPassword

    setLoading(true)
    try {
      const updated = await updateProfile(payload)
      // 비밀번호를 바꾸면 서버가 기존 토큰을 전부 무효화한다(다른 기기 포함).
      // 지금 쥐고 있는 토큰도 이미 죽었으므로 조용히 재로그인으로 보낸다 —
      // 그대로 두면 다음 요청이 401로 떨어지며 영문 모를 에러처럼 보인다.
      if (payload.password) {
        clearAuth()
        router.replace('/login?reason=reset')
        return
      }
      saveAuth(localStorage.getItem('token') ?? '', updated)
      setCurrentPassword('')
      setPassword('')
      setConfirmPassword('')
      setSecurityQuestion('')
      setSecurityAnswer('')
      setSuccess('회원정보가 수정되었습니다.')
    } catch (err: unknown) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">회원정보 수정</h1>

      <div className="bg-white dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <div className="mb-5 pb-5 border-b border-gray-100 dark:border-gray-800 text-sm text-gray-400 space-y-1">
          <p>이메일: {me.email}</p>
          <p>학번: {me.student_id}</p>
          <p>{me.generation}기</p>
          <p>
            트랙:{' '}
            {me.tracks && me.tracks.length > 0
              ? me.tracks.map((t) => t.name).join(', ')
              : '미배정 (관리자에게 문의해주세요)'}
          </p>
          <p>플랜: {me.plan ? me.plan.name : '미배정'}</p>
          {((me.caution_count ?? 0) > 0 || (me.warning_count ?? 0) > 0) && (
            <p>
              주의 {me.caution_count ?? 0}회 ·{' '}
              <span className={(me.warning_count ?? 0) > 0 ? 'text-red-500' : ''}>
                경고 {me.warning_count ?? 0}회
              </span>
            </p>
          )}
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              이름
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 transition"
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
              className="w-full bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 transition"
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
                className="w-full bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 transition"
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
                className="w-full bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 transition"
              />
              <input
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                placeholder="새 보안 질문 답변"
                className="w-full bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 transition"
              />
            </div>
          </div>

          {/* 비밀번호·보안 질문을 건드릴 때만 나타난다. 이름만 바꾸는 사람에게
              현재 비밀번호를 묻는 건 불필요한 마찰이다. */}
          {(password || securityQuestion || securityAnswer) && (
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                현재 비밀번호
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 transition"
              />
              <p className="mt-1.5 text-xs text-gray-400">
                본인 확인을 위해 필요합니다. 비밀번호를 바꾸면 다른 기기의 로그인도 모두 해제됩니다.
              </p>
            </div>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {success && <p className="text-green-500 text-sm">{success}</p>}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition"
            >
              {loading ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
