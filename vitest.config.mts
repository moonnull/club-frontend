import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    // tsconfig의 "@/*" 경로 별칭과 맞춘다.
    alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    // origin이 없으면(about:blank) jsdom이 localStorage를 제대로 만들지 않아
    // setItem이 undefined가 된다. 앱이 실제로 뜨는 주소를 준다.
    environmentOptions: { jsdom: { url: 'http://localhost:3000' } },
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // 빌드 산출물과 의존성은 테스트 대상이 아니다.
    exclude: ['node_modules/**', '.next/**'],
  },
})
