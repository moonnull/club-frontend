/**
 * macOS 동기화가 만드는 중복 파일("FormHeader 2.tsx")이 작업 트리에 있는지.
 *
 * 이 저장소는 ~/Documents 아래에 있어서 iCloud 동기화 대상이 되기 쉽고,
 * 충돌이 나면 사본이 생긴다. .gitignore가 커밋은 막아주지만 디스크에는 남아서
 * 낡은 사본이 빌드·테스트에 섞여 들어간다. 백엔드에서 같은 문제로
 * alembic이 깨진 적이 있어 양쪽 모두에서 막는다.
 */
import { describe, expect, it } from 'vitest'
import { readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

// import.meta.url은 vitest가 "/@fs/..." 형태로 주므로 경로로 쓸 수 없다.
// vitest는 프로젝트 루트에서 실행되므로 cwd가 정확하다.
const ROOT = process.cwd()
const SKIP = new Set(['.git', 'node_modules', '.next', 'dist', 'coverage'])

function walk(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP.has(entry)) continue
    const full = join(dir, entry)
    if (/ 2\./.test(entry)) found.push(relative(ROOT, full))
    if (statSync(full).isDirectory()) walk(full, found)
  }
  return found
}

describe('작업 트리', () => {
  it('동기화 사본이 남아 있지 않다', () => {
    const duplicates = walk(ROOT)
    expect(duplicates, `사본을 삭제하세요:\n  ${duplicates.join('\n  ')}`).toEqual([])
  })
})
