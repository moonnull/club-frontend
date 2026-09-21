/**
 * 과제 상세에서 떼어낸 질문 카드.
 *
 * 1,174줄짜리 파일을 쪼개면서 옮긴 컴포넌트다. 본문은 한 글자도 바꾸지
 * 않았지만, 그걸 증명한 건 diff뿐이었다. 실제로 그려지는지 여기서 고정한다.
 */
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ConfirmProvider from '@/components/ConfirmDialog'
import ToastProvider from '@/components/Toast'
import QuestionCard from '@/components/assignments/QuestionCard'
import type { User } from '@/lib/types'

// tiptap 에디터는 무겁고 이 테스트의 관심사가 아니다. 내용만 확인한다.
vi.mock('@/components/RichTextEditor', () => ({
  default: ({ content }: { content: string }) => <div data-testid="content">{content}</div>,
}))
vi.mock('@/lib/ws', () => ({ realtimeHub: { on: () => () => {} } }))

const author = { id: 7, name: '홍길동', role: 'MEMBER' as const }
const mentor = { id: 2, name: '멘토', role: 'MENTOR' as const }

const question = {
  id: 1, title: '2번 문제가 막힙니다', content: '<p>스택이 이해가 안 됩니다</p>',
  author, created_at: '2026-09-21T02:00:00', is_answered: false,
}

vi.mock('@/lib/api/assignments', () => ({
  getQuestion: vi.fn(),
  listQuestionComments: vi.fn(),
  createQuestionComment: vi.fn(),
  deleteQuestion: vi.fn(),
  deleteQuestionComment: vi.fn(),
}))

import { getQuestion, listQuestionComments } from '@/lib/api/assignments'

function show(comments: unknown[] = [], user: User | null = author as unknown as User) {
  vi.mocked(getQuestion).mockResolvedValue(question as never)
  vi.mocked(listQuestionComments).mockResolvedValue(comments as never)
  return render(
    <ToastProvider>
      <ConfirmProvider>
        <QuestionCard questionId={1} currentUser={user} onBack={() => {}} />
      </ConfirmProvider>
    </ToastProvider>
  )
}

describe('QuestionCard', () => {
  it('질문 제목·작성자·본문을 보여준다', async () => {
    show()
    expect(await screen.findByText('2번 문제가 막힙니다')).toBeInTheDocument()
    expect(screen.getByText('홍길동')).toBeInTheDocument()
    expect(screen.getByTestId('content')).toHaveTextContent('스택이 이해가 안 됩니다')
  })

  it('답변이 없으면 그렇게 알린다', async () => {
    show([])
    expect(await screen.findByText('아직 답변이 없습니다.')).toBeInTheDocument()
  })

  it('답변을 개수와 함께 보여준다', async () => {
    show([{ id: 1, content: '<p>이렇게 보세요</p>', author: mentor, created_at: '2026-09-21T03:00:00' }])
    expect(await screen.findByText(/답변 \(1\)/)).toBeInTheDocument()
  })

  it('본인 질문에는 삭제를 내준다', async () => {
    show([], author as unknown as User)
    expect(await screen.findByText('삭제')).toBeInTheDocument()
  })

  it('남의 질문에는 삭제를 내주지 않는다', async () => {
    show([], { id: 999, name: '남', role: 'MEMBER' } as User)
    await screen.findByText('2번 문제가 막힙니다')
    expect(screen.queryByText('삭제')).not.toBeInTheDocument()
  })
})
