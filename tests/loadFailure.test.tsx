/**
 * 진입 로드 실패 화면이 404와 그 외를 구분하는지.
 *
 * 다섯 개 화면이 .catch(() => setNotFound(true))로 모든 실패를 삼켜서,
 * 서버가 죽거나 네트워크가 끊겨도 "찾을 수 없습니다"라고 안내했다.
 * 사용자는 글이 지워진 줄 알고 떠난다.
 */
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import LoadFailure from '@/components/LoadFailure'
import { ApiError } from '@/lib/api/client'

describe('LoadFailure', () => {
  it('404면 그 화면에 맞는 문구를 보여준다', () => {
    render(<LoadFailure error={new ApiError('없음', 404)} notFoundText="공지사항을 찾을 수 없습니다." />)
    expect(screen.getByText('공지사항을 찾을 수 없습니다.')).toBeInTheDocument()
  })

  it('없는 글에는 "다시 시도"를 붙이지 않는다 — 눌러도 의미가 없다', () => {
    render(<LoadFailure error={new ApiError('없음', 404)} notFoundText="글을 찾을 수 없습니다." />)
    expect(screen.queryByRole('button', { name: '다시 시도' })).not.toBeInTheDocument()
  })

  it('서버가 죽었을 때 "찾을 수 없습니다"라고 하지 않는다', () => {
    render(
      <LoadFailure
        error={new ApiError('서버에 일시적인 문제가 발생했습니다. (503)', 503)}
        notFoundText="공지사항을 찾을 수 없습니다."
      />
    )
    expect(screen.queryByText('공지사항을 찾을 수 없습니다.')).not.toBeInTheDocument()
    expect(screen.getByText(/서버에 일시적인 문제/)).toBeInTheDocument()
  })

  it('404가 아니면 다시 시도할 길을 남긴다', () => {
    render(<LoadFailure error={new ApiError('서버에 연결할 수 없습니다.', 0)} notFoundText="없음" />)
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument()
  })

  it('메시지 없는 실패에도 빈 화면을 남기지 않는다', () => {
    render(<LoadFailure error={null} notFoundText="없음" />)
    expect(screen.getByText('불러오지 못했습니다.')).toBeInTheDocument()
  })
})
