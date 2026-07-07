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
    <div className="fixed inset-0 bg-[#0d0d0d] flex items-center justify-center z-40">
      <div className="w-full max-w-[380px] px-4">
        <h1 className="text-center text-3xl font-black text-white mb-8 tracking-tight">
          Chimera
        </h1>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
          {pending && (
            <p className="text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-3 py-2 mb-4">
              회원가입이 완료되었습니다. 관리자 승인 후 로그인할 수 있습니다.
            </p>
          )}
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                이메일 주소
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#252525] border border-[#333] text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition placeholder-gray-600"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                비밀번호
              </label>
              <input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                className="w-full bg-[#252525] border border-[#333] text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition placeholder-gray-600"
                required
              />
            </div>

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <div className="flex items-center justify-between pt-1">
              <div className="flex gap-4 text-xs text-gray-500">
                <Link href="/signup" className="hover:text-gray-300 transition">
                  회원가입
                </Link>
                <span className="cursor-default">비밀번호 찾기</span>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="bg-white text-gray-900 font-semibold text-sm px-5 py-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition"
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
