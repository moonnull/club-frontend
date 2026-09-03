'use client'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

export type ConfirmOptions = {
  message: string
  title?: string
  confirmLabel?: string
  cancelLabel?: string
  /** 삭제처럼 되돌릴 수 없는 동작이면 true — 확인 버튼이 빨간색이 된다. */
  destructive?: boolean
}

/** 네이티브 confirm()을 대체한다. 사용자가 선택할 때까지 기다렸다가 결과를 돌려준다. */
export type ConfirmFn = (options: string | ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext)
  if (!confirm) throw new Error('useConfirm은 ConfirmProvider 안에서만 쓸 수 있습니다.')
  return confirm
}

export default function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<ConfirmOptions | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const confirmButtonRef = useRef<HTMLButtonElement>(null)
  // 열려 있는 대화상자의 Promise resolve. 렌더와 무관한 값이라 ref에 둔다
  // (상태 업데이터 안에서 resolve를 호출하면 StrictMode에서 두 번 실행된다).
  const resolveRef = useRef<((ok: boolean) => void) | null>(null)
  // 대화상자를 열기 직전에 포커스가 있던 요소. 닫을 때 그 자리로 되돌린다.
  const lastFocused = useRef<HTMLElement | null>(null)

  const confirm = useCallback<ConfirmFn>((options) => {
    const normalized = typeof options === 'string' ? { message: options } : options
    // 이미 열려 있는 대화상자가 있으면 그 약속을 취소로 마무리한다.
    // 그냥 덮어쓰면 이전 confirm()의 Promise가 영영 resolve되지 않는다.
    resolveRef.current?.(false)
    lastFocused.current = document.activeElement as HTMLElement | null
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve
      setPending(normalized)
    })
  }, [])

  const close = useCallback((ok: boolean) => {
    resolveRef.current?.(ok)
    resolveRef.current = null
    setPending(null)
    lastFocused.current?.focus?.()
  }, [])

  useEffect(() => {
    if (!pending) return
    confirmButtonRef.current?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        close(false)
        return
      }
      // 모달이 열려 있는 동안 Tab이 뒤쪽 페이지로 새어나가지 않게 가둔다.
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>('button')
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        const active = document.activeElement
        if (e.shiftKey && (active === first || !dialogRef.current.contains(active))) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && (active === last || !dialogRef.current.contains(active))) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    // 대화상자 뒤 페이지가 스크롤되지 않도록 잠근다.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [pending, close])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center px-4 bg-black/40 dark:bg-black/70"
          onClick={() => close(false)}
        >
          <div
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-message"
            onClick={(e) => e.stopPropagation()}
            className="panel w-full max-w-sm rounded-2xl p-5 shadow-xl"
          >
            <h2 id="confirm-title" className="text-sm font-semibold text-gray-900 dark:text-white">
              {pending.title ?? '확인'}
            </h2>
            <p
              id="confirm-message"
              className="mt-2 text-sm text-gray-600 dark:text-gray-300 break-words whitespace-pre-line"
            >
              {pending.message}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => close(false)}
                className="btn-secondary text-sm px-4 py-1.5 rounded-lg"
              >
                {pending.cancelLabel ?? '취소'}
              </button>
              <button
                ref={confirmButtonRef}
                onClick={() => close(true)}
                className={`text-sm font-medium px-4 py-1.5 rounded-lg transition ${
                  pending.destructive
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'btn-primary'
                }`}
              >
                {pending.confirmLabel ?? '확인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}
