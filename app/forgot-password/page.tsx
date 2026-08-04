'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { getSecurityQuestion, verifySecurityAnswer } from '@/lib/api/auth'

const GENERIC_ERROR =
  '등록된 보안 질문을 찾을 수 없습니다. 이메일을 다시 확인하시거나 관리자에게 문의해주세요.'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<'email' | 'answer'>('email')
  const [email, setEmail] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { question: q } = await getSecurityQuestion(email)
      if (!q) {
        setError(GENERIC_ERROR)
        return
      }
      setQuestion(q)
      setStep('answer')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function submitAnswer(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { reset_token } = await verifySecurityAnswer(email, answer)
      router.push(`/reset-password?token=${encodeURIComponent(reset_token)}`)
    } catch {
      setError(GENERIC_ERROR)
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

          {step === 'email' ? (
            <form onSubmit={submitEmail} className="space-y-4">
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
                  className="gradient-btn font-semibold text-sm px-5 py-2 rounded-lg disabled:opacity-50"
                >
                  {loading ? '...' : '다음'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={submitAnswer} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">보안 질문</label>
                <p className="text-sm text-white bg-[#252525] border border-[#333] rounded-lg px-3 py-2.5">
                  {question}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">답변</label>
                <input
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  autoFocus
                  className="w-full bg-[#252525] border border-[#333] text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition placeholder-gray-600"
                  required
                />
              </div>

              {error && <p className="text-red-400 text-xs">{error}</p>}

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStep('email')
                    setAnswer('')
                    setError('')
                  }}
                  className="text-xs text-gray-500 hover:text-gray-300 transition"
                >
                  ← 이메일 다시 입력
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="gradient-btn font-semibold text-sm px-5 py-2 rounded-lg disabled:opacity-50"
                >
                  {loading ? '...' : '확인'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
