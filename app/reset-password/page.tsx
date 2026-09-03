'use client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { resetPassword } from '@/lib/api/auth'

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }
    setLoading(true)
    try {
      await resetPassword(token, password)
      router.push('/login?reason=reset')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 auth-screen flex items-center justify-center z-40">
      <div className="w-full max-w-[380px] px-4">
        <h1 className="text-center text-3xl font-black brand-text mb-8 tracking-tight">
          Chimera
        </h1>
        <div className="panel rounded-xl p-6">
          <h2 className="text-gray-900 dark:text-white text-sm font-semibold mb-4">새 비밀번호 설정</h2>
          {!token ? (
            <p className="text-sm text-red-500 dark:text-red-400">
              유효하지 않은 링크입니다.{' '}
              <Link href="/forgot-password" className="underline hover:text-red-600 dark:hover:text-red-300">
                다시 요청하기
              </Link>
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  새 비밀번호
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={4}
                  className="w-full field"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  새 비밀번호 확인
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={4}
                  className="w-full field"
                  required
                />
              </div>

              {error && <p className="text-red-500 dark:text-red-400 text-xs">{error}</p>}

              <div className="flex items-center justify-end pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary font-semibold text-sm px-5 py-2 rounded-lg disabled:opacity-50"
                >
                  {loading ? '...' : '비밀번호 변경'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
