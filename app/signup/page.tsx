'use client'
import { errorMessage } from '@/components/Toast'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { signup } from '@/lib/api/auth'
import { listPlans } from '@/lib/api/plans'
import { listTracks } from '@/lib/api/tracks'
import type { Plan, Track } from '@/lib/types'

const PASSWORD_RULE = '8자 이상, 영문 대문자·소문자·숫자를 각각 1자 이상 포함'

/** 백엔드(app/schemas/user.py)의 규칙과 동일하게 맞춘다. */
function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return PASSWORD_RULE
  if (!/[A-Z]/.test(pw)) return PASSWORD_RULE
  if (!/[a-z]/.test(pw)) return PASSWORD_RULE
  if (!/[0-9]/.test(pw)) return PASSWORD_RULE
  return null
}

const FIELD_CLASS =
  'w-full bg-white dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 transition'

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    student_id: '',
    email: '',
    password: '',
    generation: '',
    security_question: '',
    security_answer: '',
  })
  const [passwordConfirm, setPasswordConfirm] = useState('')
  // 플랜·트랙은 가입할 때만 본인이 고른다. 가입 후에는 관리자만 바꿀 수 있다.
  const [plans, setPlans] = useState<Plan[]>([])
  const [tracks, setTracks] = useState<Track[]>([])
  const [planId, setPlanId] = useState<number | null>(null)
  const [trackIds, setTrackIds] = useState<number[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // 로그인 전에도 읽을 수 있는 목록이다(GET /api/plans, /api/tracks는 공개).
  // 불러오지 못해도 가입 자체는 막지 않는다 — 선택 항목이 사라질 뿐이고,
  // 배정은 관리자가 나중에 할 수 있다.
  useEffect(() => {
    listPlans()
      .then(setPlans)
      .catch(() => setPlans([]))
    listTracks()
      .then(setTracks)
      .catch(() => setTracks([]))
  }, [])

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const toggleTrack = (id: number) =>
    setTrackIds((ids) => (ids.includes(id) ? ids.filter((t) => t !== id) : [...ids, id]))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const problem = passwordProblem(form.password)
    if (problem) {
      setError(`비밀번호는 ${problem}이어야 합니다.`)
      return
    }
    if (form.password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    setLoading(true)
    try {
      await signup({
        ...form,
        generation: Number(form.generation),
        plan_id: planId,
        track_ids: trackIds,
      })
      router.push('/login?pending=1')
    } catch (err: unknown) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const input = (k: keyof typeof form, placeholder: string, type = 'text') => (
    <input
      type={type}
      placeholder={placeholder}
      value={form[k]}
      onChange={(e) => set(k, e.target.value)}
      className={FIELD_CLASS}
      required
    />
  )

  return (
    <div className="max-w-sm mx-auto mt-12 px-4 pb-12">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">회원가입</h1>
      <form onSubmit={submit} className="space-y-3">
        {input('name', '이름')}
        {input('student_id', '학번')}
        {input('email', '이메일', 'email')}
        <div>
          {input('password', '비밀번호', 'password')}
          <p
            className={`text-xs mt-1 ${
              form.password && passwordProblem(form.password)
                ? 'text-red-500'
                : 'text-gray-400'
            }`}
          >
            {PASSWORD_RULE}
          </p>
        </div>
        <div>
          <input
            type="password"
            placeholder="비밀번호 확인"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            className={FIELD_CLASS}
            required
          />
          {passwordConfirm && form.password !== passwordConfirm && (
            <p className="text-xs text-red-500 mt-1">비밀번호가 일치하지 않습니다.</p>
          )}
        </div>
        {input('generation', '기수 (숫자)', 'number')}

        {(plans.length > 0 || tracks.length > 0) && (
          <fieldset className="pt-2 space-y-3">
            <legend className="text-sm font-medium text-gray-700 dark:text-gray-200">
              플랜과 과정
            </legend>
            <p className="text-xs text-gray-400">
              가입할 때만 선택할 수 있습니다. 이후 변경은 관리자에게 문의해주세요.
            </p>

            {plans.length > 0 && (
              <label className="block">
                <span className="text-xs text-gray-500 dark:text-gray-400">플랜</span>
                <select
                  value={planId ?? ''}
                  onChange={(e) => setPlanId(e.target.value ? Number(e.target.value) : null)}
                  className={`${FIELD_CLASS} mt-1`}
                >
                  <option value="">선택 안 함 (관리자 배정)</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {tracks.length > 0 && (
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  과정 (여러 개 선택 가능)
                </span>
                <div className="mt-1 space-y-1.5 rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-2">
                  {tracks.map((t) => (
                    <label key={t.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={trackIds.includes(t.id)}
                        onChange={() => toggleTrack(t.id)}
                        className="size-4 accent-gray-900 dark:accent-white"
                      />
                      <span className="text-gray-800 dark:text-gray-100">{t.name}</span>
                    </label>
                  ))}
                </div>
                {trackIds.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    고르지 않으면 관리자가 배정합니다.
                  </p>
                )}
              </div>
            )}
          </fieldset>
        )}

        <p className="text-xs text-gray-400 pt-2">
          비밀번호를 잊었을 때 본인 확인에 사용됩니다.
        </p>
        {input('security_question', '보안 질문 (예: 어릴 적 별명은?)')}
        {input('security_answer', '보안 질문 답변')}
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary py-2 rounded-lg font-medium disabled:opacity-50 transition"
        >
          {loading ? '처리 중...' : '가입하기'}
        </button>
      </form>
      <p className="mt-4 text-sm text-center text-gray-500">
        이미 계정이 있으신가요?{' '}
        <Link href="/login" className="text-gray-900 dark:text-white hover:underline">
          로그인
        </Link>
      </p>
    </div>
  )
}
