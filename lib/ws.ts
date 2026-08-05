const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const RECONNECT_BASE_DELAY_MS = 3000
const RECONNECT_MAX_DELAY_MS = 30000

function wsUrl(token: string): string {
  const wsBase = BASE.replace(/^http/, 'ws')
  return `${wsBase}/ws/notifications?token=${encodeURIComponent(token)}`
}

type Listener = (data: any) => void
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'
type StatusListener = (status: ConnectionStatus) => void

/**
 * 로그인 시 1개만 여는 실시간 WebSocket 연결을 여러 페이지가 타입별로 구독하는 싱글턴 허브.
 * 알림 배지, 게시판/공지사항/과제의 실시간 반영이 모두 이 연결 하나를 공유한다.
 * 연결이 끊어지면 지수 백오프(최대 30초)로 재연결을 시도하며, 구독자 목록은
 * 재연결과 무관하게 유지된다. 연결 상태는 onStatusChange로 구독할 수 있다 —
 * 토큰 만료 등으로 계속 재연결에 실패해도 최소한의 지연 상한을 두고, UI가
 * 필요하면 그 상태를 알 수 있게 한다.
 */
class RealtimeHub {
  private socket: WebSocket | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private token: string | null = null
  private listeners = new Map<string, Set<Listener>>()
  private statusListeners = new Set<StatusListener>()
  private reconnectAttempts = 0
  private status: ConnectionStatus = 'disconnected'

  connect(token: string): void {
    if (this.token === token && this.socket) return
    this.token = token
    this.reconnectAttempts = 0
    this.open()
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.status === status) return
    this.status = status
    for (const cb of this.statusListeners) cb(status)
  }

  private open(): void {
    if (!this.token) return
    this.setStatus('connecting')
    const socket = new WebSocket(wsUrl(this.token))
    this.socket = socket

    socket.onopen = () => {
      this.reconnectAttempts = 0
      this.setStatus('connected')
    }

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
      this.setStatus('disconnected')
      const delay = Math.min(
        RECONNECT_BASE_DELAY_MS * 2 ** this.reconnectAttempts,
        RECONNECT_MAX_DELAY_MS
      )
      this.reconnectAttempts += 1
      this.reconnectTimer = setTimeout(() => this.open(), delay)
    }

    socket.onerror = () => {
      socket.close()
    }
  }

  disconnect(): void {
    this.token = null
    this.reconnectAttempts = 0
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.socket?.close()
    this.socket = null
    this.setStatus('disconnected')
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

  /** 연결 상태 변화를 구독한다. 구독 즉시 현재 상태로 한 번 호출된다. */
  onStatusChange(cb: StatusListener): () => void {
    this.statusListeners.add(cb)
    cb(this.status)
    return () => this.statusListeners.delete(cb)
  }
}

export const realtimeHub = new RealtimeHub()
