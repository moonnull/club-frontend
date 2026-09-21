import '@testing-library/jest-dom/vitest'
import { JSDOM } from 'jsdom'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Node 25부터 localStorage/sessionStorage가 런타임 전역으로 들어왔는데,
// --localstorage-file 없이 실행하면 메서드가 없는 빈 객체다. 그게 jsdom이
// 만든 진짜 Storage를 가려서 setItem조차 호출할 수 없다.
// (vitest나 jsdom의 문제가 아니라 Node 런타임 쪽이다.)
// 별도의 jsdom 인스턴스에서 진짜 Storage를 가져와 덮어쓴다 — 직접 구현하면
// 용량 초과 같은 실제 동작이 달라져, 그걸 다루는 코드(lib/draft.ts)를
// 제대로 검증할 수 없다.
if (typeof globalThis.localStorage?.setItem !== 'function') {
  const { window: w } = new JSDOM('', { url: 'http://localhost:3000' })
  for (const key of ['localStorage', 'sessionStorage'] as const) {
    Object.defineProperty(globalThis, key, {
      value: w[key],
      configurable: true,
      writable: true,
    })
  }
}

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.restoreAllMocks()
})
