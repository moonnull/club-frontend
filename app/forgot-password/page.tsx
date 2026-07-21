'use client'
import Link from 'next/link'
import { useState } from 'react'
import { forgotPassword } from '@/lib/api/auth'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await forgotPassword(email)
      setSent(true)
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
          <h2 className="text-white text-sm font-semibold mb-4">비밀번호 찾기</h2>
          {sent ? (
            <p className="text-sm text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-3 py-2">
              입력하신 이메일로 재설정 링크를 보냈습니다. 받은 편지함을 확인해주세요.
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  가입 시 사용한 이메일 주소
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#252525] border border-[#333] text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition placeholder-gray-600"
                  required
                />
              </div>

              {error && <p className="text-red-400 text-xs">{error}</p>}

              <div className="flex items-center justify-between pt-1">
                <Link href="/login" className="text-xs text-gray-500 hover:text-gray-300 transition">
                  로그인으로 돌아가기
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-white text-gray-900 font-semibold text-sm px-5 py-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition"
                >
                  {loading ? '...' : '재설정 링크 받기'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
