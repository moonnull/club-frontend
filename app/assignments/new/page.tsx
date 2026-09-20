'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createAssignment } from '@/lib/api/assignments'
import { listPlans } from '@/lib/api/plans'
import { listTracks } from '@/lib/api/tracks'
import { getStoredUser } from '@/lib/session'
import RichTextEditor from '@/components/RichTextEditor'
import AttachmentPicker from '@/components/AttachmentPicker'
import type { Plan, Track, UploadResult, User } from '@/lib/types'
import { X } from 'lucide-react'

export default function NewAssignmentPage() {
  const router = useRouter()
  const user = getStoredUser<User>()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [trackId, setTrackId] = useState('')
  const [tracks, setTracks] = useState<Track[]>([])
  const [planId, setPlanId] = useState('')
  const [plans, setPlans] = useState<Plan[]>([])
  const [files, setFiles] = useState<UploadResult[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    listTracks().then(setTracks)
    listPlans().then(setPlans)
  }, [])

  // 어떤 회원에게 보이는지를 저장 전에 한 줄로 확인시켜 준다 — 플랜을 잘못 고르면
  // 해당 플랜 회원 외에는 과제 자체가 보이지 않기 때문이다.
  const scopeHint = (() => {
    const track = tracks.find((t) => String(t.id) === trackId)
    const plan = plans.find((p) => String(p.id) === planId)
    if (!track && !plan) return '모든 회원이 이 과제를 보고 제출할 수 있습니다.'
    const parts = [plan && `${plan.name} 플랜`, track && `${track.name} 트랙`].filter(Boolean)
    return `${parts.join(' + ')} 회원에게만 보이며, 다른 회원은 제출·질문도 할 수 없습니다.`
  })()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const assignment = await createAssignment({
        title,
        content,
        start_at: new Date(startAt).toISOString(),
        end_at: new Date(endAt).toISOString(),
        track_id: trackId ? Number(trackId) : null,
        plan_id: planId ? Number(planId) : null,
        files,
      })
      router.push(`/assignments/${assignment.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-gray-400">
        관리자만 접근할 수 있습니다.
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col h-full">
      <div className="flex items-center justify-between px-8 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <h1 className="text-xl font-bold brand-text">과제 등록</h1>
        <button
          type="button"
          onClick={() => router.push('/assignments')}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 transition"
        >
          <X aria-hidden="true" className="size-3.5" />
          작성 취소
        </button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-3 px-8 py-5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력하세요"
          required
          className="w-full panel text-xl font-bold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-400 transition shrink-0"
        />

        <div className="flex gap-3 shrink-0">
          <label className="flex-1 text-xs text-gray-400">
            제출 시작
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              required
              className="mt-1 w-full panel text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 transition"
            />
          </label>
          <label className="flex-1 text-xs text-gray-400">
            제출 마감
            <input
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              required
              className="mt-1 w-full panel text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 transition"
            />
          </label>
        </div>

        <div className="flex gap-3 shrink-0">
          <select
            value={trackId}
            onChange={(e) => setTrackId(e.target.value)}
            aria-label="공개 트랙"
            className="flex-1 min-w-0 panel text-sm text-gray-700 dark:text-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 transition"
          >
            <option value="">모든 트랙</option>
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} 트랙 전용
              </option>
            ))}
          </select>
          <select
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
            aria-label="공개 플랜"
            className="flex-1 min-w-0 panel text-sm text-gray-700 dark:text-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 transition"
          >
            <option value="">모든 플랜 (공통 과제)</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} 플랜 전용
              </option>
            ))}
          </select>
        </div>
        {/* 트랙과 플랜은 각각 독립적인 조건이다. 둘 다 지정하면 두 조건을 모두
            만족하는 회원에게만 보인다. */}
        <p className="text-xs text-gray-400 shrink-0 -mt-1">
          {scopeHint}
        </p>

        <RichTextEditor content={content} onChange={setContent} fullHeight />

        {error && <p className="text-red-500 text-sm shrink-0">{error}</p>}

        <div className="flex items-center justify-between gap-3 shrink-0 pt-2">
          <AttachmentPicker value={files} onChange={setFiles} />
          <button
            type="submit"
            disabled={loading}
            className="shrink-0 btn-primary px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {loading ? '등록 중...' : '등록'}
          </button>
        </div>
      </div>
    </form>
  )
}
