'use client'
import { X } from 'lucide-react'
import { createContext, useCallback, useContext, useRef, useState } from 'react'

/**
 * 실패를 사용자에게 알리는 방법은 네 가지이고, 고르는 기준은 "사용자가 지금
 * 무엇을 하고 있었는가"다. 섞어 쓰면 어떤 실패는 알려주고 어떤 실패는 아무 일도
 * 없었던 것처럼 보여서, 사용자가 동작이 먹은 건지 아닌지 판단할 수 없게 된다.
 *
 * 1. 폼 제출 실패          → setError로 폼 안에 남긴다.
 *    입력을 고쳐야 하므로 몇 초 뒤 사라지면 안 되고, 방금 누른 버튼 옆에 있어야 한다.
 * 2. 떠 있는 화면에서의 동작 실패 → toast(errorMessage(err), 'error')
 *    삭제·채점·배정처럼 화면은 그대로인데 동작만 실패한 경우.
 * 3. 화면 진입 로드 실패    → LoadFailure 컴포넌트
 *    보여줄 내용 자체가 없다. 404와 그 외(서버 장애·네트워크 단절)를 구분해
 *    안내하고, 404가 아니면 다시 시도할 길을 남긴다.
 * 4. 부가 기능 실패        → 조용히 무시하되, 왜 무시해도 되는지 주석을 단다.
 *    자동 보관·읽음 처리·배지 폴링처럼 사용자가 시작하지 않았고 할 수 있는 일도 없는 것.
 *    사용자가 방금 누른 결과라면 여기에 해당하지 않는다.
 */
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
