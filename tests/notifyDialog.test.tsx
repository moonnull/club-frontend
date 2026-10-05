/**
 * 알림 작성 대화상자.
 *
 * 일괄 발송은 되돌릴 수 없다. 받는 사람이 보여야 하고, 실패해도 쓴 내용을
 * 잃지 않아야 하며, 빈 알림이나 너무 긴 알림은 보내기 전에 막혀야 한다.
 */
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NotifyDialog from '@/components/admin/NotifyDialog'
import { NOTIFICATION_MESSAGE_MAX } from '@/lib/api/admin'

const people = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i + 1, name: `회원${i + 1}` }))

function show(props: Partial<Parameters<typeof NotifyDialog>[0]> = {}) {
  const onSend = vi.fn().mockResolvedValue(undefined)
  const onClose = vi.fn()
  render(<NotifyDialog open recipients={people(2)} onClose={onClose} onSend={onSend} {...props} />)
  return { onSend, onClose }
}

const box = () => screen.getByRole('textbox', { name: '알림 내용' })
const sendButton = () => screen.getByRole('button', { name: /에게 보내기|보내는 중/ })

describe('받는 사람', () => {
  it('인원과 이름을 보여준다', () => {
    show()
    expect(screen.getByText('알림 보내기 · 2명')).toBeInTheDocument()
    expect(screen.getByText(/회원1, 회원2/)).toBeInTheDocument()
  })

  it('많으면 앞의 몇 명만 펼치고 나머지는 "외 N명"으로 줄인다', () => {
    show({ recipients: people(8) })
    expect(screen.getByText(/외 3명/)).toBeInTheDocument()
  })

  it('누르면 어디로 가는지 알려준다', () => {
    show({ linkLabel: "'1주차' 과제" })
    expect(screen.getByText(/알림을 누르면 이동: '1주차' 과제/)).toBeInTheDocument()
  })
})

describe('보내기', () => {
  it('기본 문구로 시작하고, 앞뒤 공백을 걷어 보낸다', async () => {
    const user = userEvent.setup()
    const { onSend } = show({ defaultMessage: '과제를 내주세요' })
    expect(box()).toHaveValue('과제를 내주세요')
    await user.type(box(), '   ')
    await user.click(sendButton())
    expect(onSend).toHaveBeenCalledWith('과제를 내주세요')
  })

  it('비어 있으면 보낼 수 없다', async () => {
    const user = userEvent.setup()
    show()
    expect(sendButton()).toBeDisabled()
    await user.type(box(), '   ')
    expect(sendButton()).toBeDisabled()
  })

  it('너무 길면 보낼 수 없고 글자 수가 빨갛게 표시된다', async () => {
    show({ defaultMessage: '가'.repeat(NOTIFICATION_MESSAGE_MAX + 1) })
    expect(sendButton()).toBeDisabled()
    expect(screen.getByText(`${NOTIFICATION_MESSAGE_MAX + 1} / ${NOTIFICATION_MESSAGE_MAX}`)).toHaveClass('text-red-500')
  })

  it('받는 사람이 없으면 보낼 수 없다', () => {
    show({ recipients: [], defaultMessage: '안내' })
    expect(sendButton()).toBeDisabled()
  })

  it('실패하면 이유를 보여주고 쓴 내용을 남긴다', async () => {
    const user = userEvent.setup()
    show({
      defaultMessage: '중요한 안내',
      onSend: vi.fn().mockRejectedValue(new Error('일부 회원을 찾을 수 없습니다.')),
    })
    await user.click(sendButton())
    expect(await screen.findByText('일부 회원을 찾을 수 없습니다.')).toBeInTheDocument()
    expect(box()).toHaveValue('중요한 안내')
    expect(sendButton()).toBeEnabled()
  })

  it('Ctrl+Enter로 바로 보낸다', async () => {
    const user = userEvent.setup()
    const { onSend } = show({ defaultMessage: '단축키' })
    box().focus()
    await user.keyboard('{Control>}{Enter}{/Control}')
    expect(onSend).toHaveBeenCalledWith('단축키')
  })
})

describe('닫기', () => {
  it('Esc로 닫힌다', async () => {
    const user = userEvent.setup()
    const { onClose } = show()
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('닫혀 있으면 아무것도 그리지 않는다', () => {
    render(<NotifyDialog open={false} recipients={people(1)} onClose={() => {}} onSend={async () => {}} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
