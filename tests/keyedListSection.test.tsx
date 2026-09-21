/**
 * 게시판·트랙·플랜 관리 구역.
 *
 * 세 구역이 200줄 가까이 거의 같은 모양으로 반복돼 있었다. 하나로 모으면서
 * 추가 폼의 입력값과 오류 표시가 구역 안으로 들어왔다 — 그 부분이 제대로
 * 동작하는지가 이 테스트의 핵심이다.
 */
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ToastProvider from '@/components/Toast'
import KeyedListSection, { type KeyedItem } from '@/components/admin/KeyedListSection'

const items = [
  { id: 1, key: 'REV', name: '리버싱' },
  { id: 2, key: 'WEB', name: '웹해킹' },
]

function show(props: Partial<React.ComponentProps<typeof KeyedListSection<KeyedItem>>> = {}) {
  const onAdd = vi.fn().mockResolvedValue(undefined)
  const onRename = vi.fn()
  const onDelete = vi.fn()
  render(
    <ToastProvider>
      <KeyedListSection
        title="트랙 관리"
        items={items}
        keyPlaceholder="키 (예: REVERSING)"
        namePlaceholder="이름 (예: 리버싱)"
        onAdd={onAdd}
        onRename={onRename}
        onDelete={onDelete}
        {...props}
      />
    </ToastProvider>
  )
  return { onAdd, onRename, onDelete }
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>, key: string, name: string) {
  await user.type(screen.getByPlaceholderText(/^키/), key)
  await user.type(screen.getByPlaceholderText(/^이름/), name)
  await user.click(screen.getByRole('button', { name: '추가' }))
}

describe('목록', () => {
  it('제목에 개수를 함께 보여준다', () => {
    show()
    expect(screen.getByText('트랙 관리 (2)')).toBeInTheDocument()
  })

  it('이름과 키를 함께 보여준다', () => {
    show()
    expect(screen.getByText('리버싱')).toBeInTheDocument()
    expect(screen.getByText('· REV')).toBeInTheDocument()
  })

  it('비었을 때만 안내 문구를 보여준다', () => {
    show({ items: [], emptyText: '등록된 플랜이 없습니다.' })
    expect(screen.getByText('등록된 플랜이 없습니다.')).toBeInTheDocument()
  })

  it('항목이 있으면 안내 문구를 띄우지 않는다', () => {
    show({ emptyText: '등록된 플랜이 없습니다.' })
    expect(screen.queryByText('등록된 플랜이 없습니다.')).not.toBeInTheDocument()
  })
})

describe('추가', () => {
  it('키는 대문자로 맞춘다 — 코드로 쓰이는 값이다', async () => {
    const user = userEvent.setup()
    const { onAdd } = show()
    await fillAndSubmit(user, 'reversing', '리버싱')
    expect(onAdd).toHaveBeenCalledWith('REVERSING', '리버싱')
  })

  it('성공하면 입력칸을 비운다', async () => {
    const user = userEvent.setup()
    show()
    await fillAndSubmit(user, 'PWN', '시스템해킹')
    expect(screen.getByPlaceholderText(/^키/)).toHaveValue('')
    expect(screen.getByPlaceholderText(/^이름/)).toHaveValue('')
  })

  it('실패하면 폼 안에 이유를 남기고 입력값을 지우지 않는다', async () => {
    const user = userEvent.setup()
    show({ onAdd: vi.fn().mockRejectedValue(new Error('이미 존재하는 트랙 키입니다.')) })
    await fillAndSubmit(user, 'REV', '리버싱')

    expect(await screen.findByText('이미 존재하는 트랙 키입니다.')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/^키/)).toHaveValue('REV')
  })
})

describe('게시판만의 추가 표시', () => {
  const boards = [{ id: 1, key: 'NOTICE', name: '공지사항', admin_only: true }]

  // 게시판은 항목 타입에 admin_only가 더 있어 공용 헬퍼로 감쌀 수 없다.
  function showBoards(extra: Partial<React.ComponentProps<typeof KeyedListSection<(typeof boards)[0]>>>) {
    render(
      <ToastProvider>
        <KeyedListSection
          title="게시판 관리"
          items={boards}
          keyPlaceholder="키 (예: STUDY)"
          namePlaceholder="이름 (예: 스터디)"
          onAdd={vi.fn().mockResolvedValue(undefined)}
          onRename={vi.fn()}
          onDelete={vi.fn()}
          {...extra}
        />
      </ToastProvider>
    )
  }

  it('관리자 전용 표시를 붙인다', () => {
    showBoards({ renderBadge: (b) => b.admin_only && <span>관리자 전용 작성</span> })
    expect(screen.getByText('관리자 전용 작성')).toBeInTheDocument()
  })

  it('전환 버튼을 끼워 넣을 수 있다', async () => {
    const user = userEvent.setup()
    const toggle = vi.fn()
    showBoards({
      renderExtraAction: (b) => <button onClick={() => toggle(b)}>전체 작성 허용</button>,
    })
    await user.click(screen.getByRole('button', { name: '전체 작성 허용' }))
    expect(toggle).toHaveBeenCalledWith(boards[0])
  })

  it('다른 구역에는 그 버튼이 없다', () => {
    show()
    expect(screen.queryByRole('button', { name: '전체 작성 허용' })).not.toBeInTheDocument()
  })
})
