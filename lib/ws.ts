const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const RECONNECT_DELAY_MS = 3000

function wsUrl(token: string): string {
  const wsBase = BASE.replace(/^http/, 'ws')
  return `${wsBase}/ws/notifications?token=${encodeURIComponent(token)}`
}

/**
 * 알림 안 읽은 개수를 실시간으로 받는 WebSocket 연결을 연다.
 * 연결이 끊어지면 일정 지연 후 자동 재연결한다. 반환된 함수를 호출하면
 * 재연결을 멈추고 연결을 닫는다 (로그아웃/언마운트 시 사용).
 */
export function connectNotificationSocket(token: string, onCount: (count: number) => void): () => void {
  let socket: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let stopped = false

  function open() {
    if (stopped) return
    socket = new WebSocket(wsUrl(token))

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (typeof data.unread_count === 'number') onCount(data.unread_count)
      } catch {
        // 파싱 실패한 메시지는 무시
      }
    }

    socket.onclose = () => {
      if (stopped) return
      reconnectTimer = setTimeout(open, RECONNECT_DELAY_MS)
    }

    socket.onerror = () => {
      socket?.close()
    }
  }

  open()

  return () => {
    stopped = true
    if (reconnectTimer) clearTimeout(reconnectTimer)
    socket?.close()
  }
}
