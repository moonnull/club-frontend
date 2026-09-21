'use client'
import { useEffect, useState } from 'react'
import { listPlans } from '@/lib/api/plans'
import { listTracks } from '@/lib/api/tracks'
import type { Plan, Track } from '@/lib/types'

/**
 * 과제의 제출 기간과 공개 범위(트랙·플랜) 입력.
 *
 * 등록 화면과 수정 화면이 이 블록을 통째로 복사해 쓰고 있었다. 플랜 선택을
 * 추가할 때 양쪽을 따로 고쳐야 했고, 실제로 수정 화면에서 기존 플랜을 불러오는
 * 한 줄을 빠뜨린 적이 있다. 필드가 늘어날 때 한 곳만 고치면 되도록 묶는다.
 */
export default function AssignmentScopeFields({
  startAt,
  endAt,
  trackId,
  planId,
  onChange,
}: {
  startAt: string
  endAt: string
  trackId: string
  planId: string
  onChange: (next: { startAt?: string; endAt?: string; trackId?: string; planId?: string }) => void
}) {
  const [tracks, setTracks] = useState<Track[]>([])
  const [plans, setPlans] = useState<Plan[]>([])

  useEffect(() => {
    listTracks().then(setTracks)
    listPlans().then(setPlans)
  }, [])

  // 어떤 회원에게 보이는지를 저장 전에 한 줄로 확인시켜 준다 — 플랜을 잘못 고르면
  // 해당 플랜 회원 외에는 과제 자체가 보이지 않기 때문이다.
  const track = tracks.find((t) => String(t.id) === trackId)
  const plan = plans.find((p) => String(p.id) === planId)
  const scopeHint =
    !track && !plan
      ? '모든 회원이 이 과제를 보고 제출할 수 있습니다.'
      : `${[plan && `${plan.name} 플랜`, track && `${track.name} 트랙`]
          .filter(Boolean)
          .join(' + ')} 회원에게만 보이며, 다른 회원은 제출·질문도 할 수 없습니다.`

  const field =
    'mt-1 w-full panel text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 transition'
  const select =
    'flex-1 min-w-0 panel text-sm text-gray-700 dark:text-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 transition'

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 shrink-0">
        <label className="flex-1 text-xs text-gray-400">
          제출 시작
          <input
            type="datetime-local"
            value={startAt}
            onChange={(e) => onChange({ startAt: e.target.value })}
            required
            className={field}
          />
        </label>
        <label className="flex-1 text-xs text-gray-400">
          제출 마감
          <input
            type="datetime-local"
            value={endAt}
            onChange={(e) => onChange({ endAt: e.target.value })}
            required
            className={field}
          />
        </label>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 shrink-0">
        <select
          value={trackId}
          onChange={(e) => onChange({ trackId: e.target.value })}
          aria-label="공개 트랙"
          className={select}
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
          onChange={(e) => onChange({ planId: e.target.value })}
          aria-label="공개 플랜"
          className={select}
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
      <p className="text-xs text-gray-400 shrink-0 -mt-1">{scopeHint}</p>
    </>
  )
}
