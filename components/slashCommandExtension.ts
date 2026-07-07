import { Extension } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import { ReactRenderer } from '@tiptap/react'
import SlashCommandMenu, { SlashCommandMenuHandle, SlashItem } from './SlashCommandMenu'

function buildItems(onImage: (insert: (url: string) => void) => void): SlashItem[] {
  return [
    {
      title: '제목 1',
      icon: 'H1',
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run(),
    },
    {
      title: '제목 2',
      icon: 'H2',
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run(),
    },
    {
      title: '제목 3',
      icon: 'H3',
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run(),
    },
    {
      title: '글머리 기호 목록',
      icon: '•',
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
    },
    {
      title: '번호 매기기 목록',
      icon: '1.',
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
    },
    {
      title: '인용구',
      icon: '❝',
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
    },
    {
      title: '코드 블록',
      icon: '</>',
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
    },
    {
      title: '구분선',
      icon: '—',
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
    },
    {
      title: '이미지',
      icon: '🖼️',
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run()
        onImage((url) => editor.chain().focus().setImage({ src: url }).run())
      },
    },
  ]
}

export interface SlashCommandOptions {
  onImage: (insert: (url: string) => void) => void
}

export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: 'slashCommand',

  addOptions() {
    return { onImage: () => {} }
  },

  addProseMirrorPlugins() {
    const options = this.options
    const items = buildItems(options.onImage)

    return [
      Suggestion({
        editor: this.editor,
        char: '/',
        items: ({ query }) =>
          items.filter((item) => item.title.toLowerCase().includes(query.toLowerCase())).slice(0, 10),
        command: ({ editor, range, props }) => {
          ;(props as SlashItem).command({ editor, range })
        },
        render: () => {
          let component: ReactRenderer<SlashCommandMenuHandle>
          let unmount: (() => void) | undefined

          return {
            onStart: (props) => {
              component = new ReactRenderer(SlashCommandMenu, {
                props,
                editor: props.editor,
              })
              unmount = props.mount(component.element as HTMLElement)
            },
            onUpdate(props) {
              component.updateProps(props)
            },
            onKeyDown(props) {
              if (props.event.key === 'Escape') {
                unmount?.()
                return true
              }
              return component.ref?.onKeyDown(props) ?? false
            },
            onExit() {
              unmount?.()
              component.destroy()
            },
          }
        },
      }),
    ]
  },
})
