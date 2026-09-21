'use client'
import { useState } from 'react'
import { errorMessage } from '@/components/Toast'

/**
 * 게시판·트랙·플랜처럼 "키 + 이름"으로 이루어진 목록을 관리하는 구역.
 *
 * 세 구역이 200줄 가까이 거의 같은 모양으로 반복돼 있었다. 다른 점은 제목과
 * 안내 문구, 그리고 게시판에만 있는 "관리자 전용" 표시·전환뿐이라 그것만
 * 밖에서 받는다.
 *
 * 추가 폼의 입력값과 오류는 이 구역 안에서만 쓰이므로 여기가 들고 있는다.
 * 부모는 실제로 서버에 보내는 일만 하고, 실패하면 그대로 던지면 된다.
 */
export interface KeyedItem {
  id: number
  key: string
  name: string
}

export default function KeyedListSection<T extends KeyedItem>({
  title,
  items,
  keyPlaceholder,
  namePlaceholder,
  emptyText,
  onAdd,
  onRename,
  onDelete,
  renderBadge,
  renderExtraAction,
  className = 'mt-10',
}: {
  title: string
  items: T[]
  keyPlaceholder: string
  namePlaceholder: string
  /** 목록이 비었을 때의 안내. 없으면 아무것도 보여주지 않는다. */
  emptyText?: string
  /** 실패하면 던진다 — 이 구역이 폼 안에 오류를 표시한다. */
  onAdd: (key: string, name: string) => Promise<void>
  onRename: (item: T) => void
  onDelete: (item: T) => void
  renderBadge?: (item: T) => React.ReactNode
  renderExtraAction?: (item: T) => React.ReactNode
  className?: string
}) {
  const [draft, setDraft] = useState({ key: '', name: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await onAdd(draft.key, draft.name)
      setDraft({ key: '', name: '' })
    } catch (err: unknown) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const field =
    'bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400'

  return (
    <section className={className}>
      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
        {title} ({items.length})
      </h2>

      <div className="space-y-2 mb-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between bg-white dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3"
          >
            <p className="font-medium text-gray-800 dark:text-gray-100">
              {item.name} <span className="text-gray-400 font-normal">· {item.key}</span>
              {renderBadge?.(item)}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => onRename(item)}
                className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white px-3 py-1.5 transition"
              >
                이름 수정
              </button>
              {renderExtraAction?.(item)}
              <button
                onClick={() => onDelete(item)}
                className="text-sm text-gray-400 hover:text-red-500 px-3 py-1.5 transition"
              >
                삭제
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && emptyText && (
          <p className="text-sm text-gray-400">{emptyText}</p>
        )}
      </div>

      <form
        onSubmit={submit}
        className="flex flex-wrap items-center gap-2 bg-white dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3"
      >
        <input
          value={draft.key}
          // 키는 코드로 쓰이므로 대문자로 맞춘다.
          onChange={(e) => setDraft((d) => ({ ...d, key: e.target.value.toUpperCase() }))}
          placeholder={keyPlaceholder}
          required
          className={`${field} w-40`}
        />
        <input
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          placeholder={namePlaceholder}
          required
          className={`${field} flex-1 min-w-[140px]`}
        />
        <button
          type="submit"
          disabled={busy}
          className="text-sm btn-primary px-3 py-1.5 rounded-lg font-medium transition disabled:opacity-50"
        >
          추가
        </button>
        {error && <p className="w-full text-red-500 text-xs">{error}</p>}
      </form>
    </section>
  )
}
