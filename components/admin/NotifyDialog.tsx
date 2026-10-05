'use client'
import { useEffect, useRef, useState } from 'react'
import { NOTIFICATION_MESSAGE_MAX } from '@/lib/api/admin'
import { errorMessage } from '@/components/Toast'

/** 받는 사람 이름을 이만큼만 펼쳐 보이고 나머지는 "외 N명"으로 줄인다. */
const PREVIEW_NAMES = 5

/**
 * 한 명 또는 여러 명에게 보낼 알림을 쓰는 대화상자.
 *
 * window.prompt는 한 줄짜리라 안내문을 쓰기 어렵고, 누구에게 가는지 보여줄
 * 자리도 없다. 일괄 발송은 실수로 엉뚱한 사람들에게 보내면 되돌릴 수 없으므로
 * 받는 사람을 확인할 수 있어야 한다.
 *
 * 보내기에 실패하면 대화상자를 닫지 않는다 — 쓴 내용을 잃지 않게 한다.
 */
export default function NotifyDialog({
  open,
  recipients,
  defaultMessage = '',
  linkLabel,
  onClose,
  onSend,
}: {
  open: boolean
  recipients: { id: number; name: string }[]
  defaultMessage?: string
  /** 알림을 누르면 이동할 곳의 설명. 있으면 화면에 보여준다. */
  linkLabel?: string
  onClose: () => void
  /** 실패하면 던진다 — 대화상자 안에 이유를 보여준다. */
  onSend: (message: string) => Promise<void>
}) {
  const [message, setMessage] = useState(defaultMessage)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  // 열 때마다 새로 시작한다. 직전에 다른 과제로 쓰던 문구가 남아 있으면 안 된다.
  useEffect(() => {
    if (!open) return
    setMessage(defaultMessage)
    setError('')
    setBusy(false)
    // 렌더가 끝난 뒤에 포커스를 줘야 실제로 들어간다.
    requestAnimationFrame(() => textRef.current?.focus())
  }, [open, defaultMessage])

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) {
        e.preventDefault()
        onClose()
      }
      // Tab이 뒤쪽 페이지로 새어나가지 않게 가둔다.
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>('textarea, button:not([disabled])')
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, busy, onClose])

  if (!open) return null

  const trimmed = message.trim()
  const tooLong = message.length > NOTIFICATION_MESSAGE_MAX
  const canSend = trimmed.length > 0 && !tooLong && !busy && recipients.length > 0

  const shown = recipients.slice(0, PREVIEW_NAMES).map((r) => r.name).join(', ')
  const rest = recipients.length - PREVIEW_NAMES

  async function send() {
    if (!canSend) return
    setBusy(true)
    setError('')
    try {
      await onSend(trimmed)
    } catch (err: unknown) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center px-4 bg-black/40 dark:bg-black/70"
      onClick={() => !busy && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notify-title"
        onClick={(e) => e.stopPropagation()}
        className="panel w-full max-w-md rounded-2xl p-5 shadow-xl"
      >
        <h2 id="notify-title" className="text-sm font-semibold text-gray-900 dark:text-white">
          알림 보내기 · {recipients.length}명
        </h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 break-keep">
          받는 사람: {shown}
          {rest > 0 && ` 외 ${rest}명`}
        </p>
        {linkLabel && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            알림을 누르면 이동: {linkLabel}
          </p>
        )}

        <textarea
          ref={textRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            // Ctrl/⌘+Enter로 바로 보낸다. Enter만으로는 줄바꿈이다.
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              void send()
            }
          }}
          rows={4}
          placeholder="보낼 내용을 입력하세요."
          aria-label="알림 내용"
          className="mt-3 w-full resize-none bg-white dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
        />
        <div className="mt-1 flex items-start justify-between gap-2">
          <p className="text-xs text-red-500 min-h-4">{error}</p>
          <p className={`text-xs shrink-0 tabular-nums ${tooLong ? 'text-red-500' : 'text-gray-400'}`}>
            {message.length} / {NOTIFICATION_MESSAGE_MAX}
          </p>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={busy}
            className="btn-secondary text-sm px-4 py-1.5 rounded-lg disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={() => void send()}
            disabled={!canSend}
            className="btn-primary text-sm font-medium px-4 py-1.5 rounded-lg transition disabled:opacity-50"
          >
            {busy ? '보내는 중...' : `${recipients.length}명에게 보내기`}
          </button>
        </div>
      </div>
    </div>
  )
}
