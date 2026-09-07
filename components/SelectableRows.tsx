'use client'
import { useState } from 'react'

/**
 * 체크박스로 여러 행을 골라 지우는 목록.
 *
 * 삭제는 되돌릴 수 없으므로 선택한 것이 없으면 버튼이 비활성이고,
 * 삭제 후에는 선택을 비워 같은 항목을 두 번 지우려 시도하지 않게 한다.
 */
export default function SelectableRows<T extends { id: number }>({
  rows,
  total,
  renderRow,
  onDelete,
  emptyMessage = '항목이 없습니다.',
}: {
  rows: T[]
  total: number
  renderRow: (row: T) => React.ReactNode
  onDelete: (ids: number[]) => Promise<void>
  emptyMessage?: string
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [deleting, setDeleting] = useState(false)

  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id))

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected(allChecked ? new Set() : new Set(rows.map((r) => r.id)))
  }

  async function remove() {
    setDeleting(true)
    try {
      await onDelete([...selected])
      setSelected(new Set())
    } finally {
      setDeleting(false)
    }
  }

  if (rows.length === 0) {
    return <p className="mt-3 text-sm text-gray-400">{emptyMessage}</p>
  }

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-800">
        <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={allChecked}
            onChange={toggleAll}
            className="accent-gray-900 dark:accent-white"
          />
          전체 선택
        </label>
        <span className="text-xs text-gray-400">
          {selected.size > 0 ? `${selected.size}건 선택됨` : `${rows.length} / 총 ${total}건`}
        </span>
        <button
          onClick={remove}
          disabled={selected.size === 0 || deleting}
          className="ml-auto text-sm font-medium px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-30"
        >
          {deleting ? '삭제 중...' : `선택 삭제${selected.size > 0 ? ` (${selected.size})` : ''}`}
        </button>
      </div>

      <ul className="max-h-72 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/60">
        {rows.map((row) => (
          <li key={row.id} className="flex items-start gap-2 py-2">
            <input
              type="checkbox"
              checked={selected.has(row.id)}
              onChange={() => toggle(row.id)}
              aria-label={`${row.id}번 항목 선택`}
              className="mt-0.5 shrink-0 accent-gray-900 dark:accent-white"
            />
            <div className="min-w-0 flex-1">{renderRow(row)}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}
