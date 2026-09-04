'use client'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { Track } from '@/lib/types'

/** 한 사람이 여러 트랙을 수강할 수 있어, 체크박스 드롭다운으로 여러 개를 고른다. */
export default function TrackMultiSelect({
  tracks,
  selected,
  onChange,
  disabled = false,
}: {
  tracks: Track[]
  selected: number[]
  onChange: (trackIds: number[]) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const selectedNames = tracks.filter((t) => selected.includes(t.id)).map((t) => t.name)
  const label =
    selectedNames.length === 0
      ? '트랙 미배정'
      : selectedNames.length <= 2
        ? selectedNames.join(', ')
        : `${selectedNames[0]} 외 ${selectedNames.length - 1}개`

  function toggle(trackId: number) {
    onChange(
      selected.includes(trackId)
        ? selected.filter((id) => id !== trackId)
        : [...selected, trackId],
    )
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        className="w-40 flex items-center justify-between gap-1 text-sm bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50"
      >
        <span className="truncate">{label}</span>
        <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-gray-400" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 w-48 max-h-60 overflow-y-auto panel rounded-lg shadow-xl py-1">
          {tracks.length === 0 ? (
            <p className="px-3 py-2 text-xs text-gray-400">등록된 트랙이 없습니다.</p>
          ) : (
            tracks.map((t) => (
              <label
                key={t.id}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.04] cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(t.id)}
                  onChange={() => toggle(t.id)}
                  className="accent-gray-900 dark:accent-white"
                />
                <span className="truncate">{t.name}</span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  )
}
