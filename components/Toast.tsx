'use client'
import { X } from 'lucide-react'
import { createContext, useCallback, useContext, useRef, useState } from 'react'

export type ToastVariant = 'info' | 'error'
type ToastItem = { id: number; message: string; variant: ToastVariant }

/** 토스트를 띄우는 함수. 기본은 'info', 실패 알림은 'error'. */
export type ToastFn = (message: string, variant?: ToastVariant) => void

const ToastContext = createContext<ToastFn | null>(null)

const DURATION_MS = 4000

export function useToast(): ToastFn {
  const toast = useContext(ToastContext)
  if (!toast) throw new Error('useToast는 ToastProvider 안에서만 쓸 수 있습니다.')
  return toast
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback<ToastFn>(
    (message, variant = 'info') => {
      const id = nextId.current++
      setItems((prev) => [...prev, { id, message, variant }])
      setTimeout(() => dismiss(id), DURATION_MS)
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 px-4 w-full max-w-sm pointer-events-none"
        // 스크린리더가 새 메시지를 읽도록 라이브 영역으로 표시한다.
        aria-live="polite"
        aria-atomic="false"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role={t.variant === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto w-full rounded-lg px-4 py-3 text-sm shadow-lg flex items-start gap-3 ${
              t.variant === 'error'
                ? 'bg-red-600 text-white'
                : 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
            }`}
          >
            <span className="flex-1 break-words">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="알림 닫기"
              className="shrink-0 opacity-60 hover:opacity-100 transition"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

/** API 에러를 사용자에게 보여줄 문자열로 바꾼다. */
export function errorMessage(err: unknown, fallback = '오류가 발생했습니다.'): string {
  return err instanceof Error && err.message ? err.message : fallback
}
