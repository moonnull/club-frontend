'use client'
import { Minus, Plus } from 'lucide-react'

/** 주의/경고 누적 횟수를 관리자가 1씩 조정하는 컨트롤. */
export default function PenaltyStepper({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (next: number) => void
}) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <span className="text-xs text-gray-400">{label}</span>
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= 0}
        aria-label={`${label} 1회 줄이기`}
        className="btn-secondary rounded p-1 disabled:opacity-30"
      >
        <Minus aria-hidden="true" className="size-3" />
      </button>
      <span
        className={`w-5 text-center text-xs tabular-nums font-medium ${
          value > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-400'
        }`}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        aria-label={`${label} 1회 늘리기`}
        className="btn-secondary rounded p-1"
      >
        <Plus aria-hidden="true" className="size-3" />
      </button>
    </div>
  )
}
