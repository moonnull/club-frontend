'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { api } from '@/lib/api'

const PARTS = ['개발', '기획', '디자인', '기타']

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    student_id: '',
    email: '',
    password: '',
    generation: '',
    part: PARTS[0],
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/api/auth/signup', {
        ...form,
        generation: Number(form.generation),
      })
      router.push('/login')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const input = (
    k: keyof typeof form,
    placeholder: string,
    type = 'text'
  ) => (
    <input
      type={type}
      placeholder={placeholder}
      value={form[k]}
      onChange={(e) => set(k, e.target.value)}
      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
      required
    />
  )

  return (
    <div className="max-w-sm mx-auto mt-12">
      <h1 className="text-2xl font-bold mb-6">회원가입</h1>
      <form onSubmit={submit} className="space-y-3">
        {input('name', '이름')}
        {input('student_id', '학번')}
        {input('email', '이메일', 'email')}
        {input('password', '비밀번호', 'password')}
        {input('generation', '기수 (숫자)', 'number')}
        <select
          value={form.part}
          onChange={(e) => set('part', e.target.value)}
          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
        >
          {PARTS.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-medium disabled:opacity-50 transition"
        >
          {loading ? '처리 중...' : '가입하기'}
        </button>
      </form>
      <p className="mt-4 text-sm text-center text-gray-500">
        이미 계정이 있으신가요?{' '}
        <Link href="/login" className="text-indigo-600 hover:underline">
          로그인
        </Link>
      </p>
    </div>
  )
}
