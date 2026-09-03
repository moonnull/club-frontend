'use client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { getMe, login } from '@/lib/api/auth'
import { saveAuth } from '@/lib/session'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pending = searchParams.get('pending') === '1'
  const expired = searchParams.get('reason') === 'expired'
  const resetDone = searchParams.get('reason') === 'reset'
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { access_token } = await login(email, pw)
      localStorage.setItem('token', access_token)
      const me = await getMe()
      saveAuth(access_token, me)
      router.push('/')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 auth-screen flex items-center justify-center z-40">
      <div className="w-full max-w-[380px] px-4">
        <h1 className="text-center text-4xl font-black brand-text mb-8 tracking-tight">
          Chimera
        </h1>
        <div className="panel rounded-2xl p-6 shadow-xl">
          {pending && (
            <p className="banner">
              회원가입이 완료되었습니다. 관리자 승인 후 로그인할 수 있습니다.
            </p>
          )}
          {expired && (
            <p className="banner">
              세션이 만료되어 로그아웃되었습니다. 다시 로그인해주세요.
            </p>
          )}
          {resetDone && (
            <p className="banner">
              비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.
            </p>
          )}
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                이메일 주소
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full field"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                비밀번호
              </label>
              <input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                className="w-full field"
                required
              />
            </div>

            {error && <p className="text-red-500 dark:text-red-400 text-xs">{error}</p>}

            <div className="flex items-center justify-between pt-1">
              <div className="flex gap-4 text-xs text-gray-500">
                <Link href="/signup" className="hover:text-gray-900 dark:hover:text-gray-200 transition">
                  회원가입
                </Link>
                <Link href="/forgot-password" className="hover:text-gray-900 dark:hover:text-gray-200 transition">
                  비밀번호 찾기
                </Link>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary font-semibold text-sm px-5 py-2 rounded-lg disabled:opacity-50"
              >
                {loading ? '...' : '로그인'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
