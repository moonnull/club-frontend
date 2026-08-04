const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const RECONNECT_DELAY_MS = 3000

function wsUrl(token: string): string {
  const wsBase = BASE.replace(/^http/, 'ws')
  return `${wsBase}/ws/notifications?token=${encodeURIComponent(token)}`
}

type Listener = (data: any) => void

/**
 * 로그인 시 1개만 여는 실시간 WebSocket 연결을 여러 페이지가 타입별로 구독하는 싱글턴 허브.
 * 알림 배지, 게시판/공지사항/과제의 실시간 반영이 모두 이 연결 하나를 공유한다.
 * 연결이 끊어지면 일정 지연 후 자동 재연결하며, 구독자 목록은 재연결과 무관하게 유지된다.
 */
class RealtimeHub {
  private socket: WebSocket | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private token: string | null = null
  private listeners = new Map<string, Set<Listener>>()

  connect(token: string): void {
    if (this.token === token && this.socket) return
    this.token = token
    this.open()
  }

  private open(): void {
    if (!this.token) return
    const socket = new WebSocket(wsUrl(this.token))
    this.socket = socket

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (typeof data.type !== 'string') return
        for (const cb of this.listeners.get(data.type) ?? []) cb(data)
      } catch {
        // 파싱 실패한 메시지는 무시
      }
    }

    socket.onclose = () => {
      if (this.token === null) return
      this.reconnectTimer = setTimeout(() => this.open(), RECONNECT_DELAY_MS)
    }

    socket.onerror = () => {
      socket.close()
    }
  }

  disconnect(): void {
    this.token = null
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.socket?.close()
    this.socket = null
  }

  on(type: string, cb: Listener): () => void {
    let set = this.listeners.get(type)
    if (!set) {
      set = new Set()
      this.listeners.set(type, set)
    }
    set.add(cb)
    return () => set!.delete(cb)
  }
}

export const realtimeHub = new RealtimeHub()
