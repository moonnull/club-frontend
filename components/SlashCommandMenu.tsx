'use client'
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import type { Editor, Range } from '@tiptap/core'

export interface SlashItem {
  title: string
  icon: string
  command: (opts: { editor: Editor; range: Range }) => void
}

interface Props {
  items: SlashItem[]
  command: (item: SlashItem) => void
}

export interface SlashCommandMenuHandle {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

const SlashCommandMenu = forwardRef<SlashCommandMenuHandle, Props>((props, ref) => {
  const [selected, setSelected] = useState(0)

  useEffect(() => setSelected(0), [props.items])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (props.items.length === 0) return false
      if (event.key === 'ArrowDown') {
        setSelected((s) => (s + 1) % props.items.length)
        return true
      }
      if (event.key === 'ArrowUp') {
        setSelected((s) => (s - 1 + props.items.length) % props.items.length)
        return true
      }
      if (event.key === 'Enter') {
        const item = props.items[selected]
        if (item) props.command(item)
        return true
      }
      return false
    },
  }))

  if (props.items.length === 0) return null

  return (
    <div className="w-56 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-lg shadow-lg py-1 max-h-72 overflow-y-auto">
      {props.items.map((item, i) => (
        <button
          key={item.title}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault()
            props.command(item)
          }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition ${
            i === selected
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
              : 'text-gray-600 dark:text-gray-300'
          }`}
        >
          <span className="text-base w-5 text-center">{item.icon}</span>
          <span>{item.title}</span>
        </button>
      ))}
    </div>
  )
})

SlashCommandMenu.displayName = 'SlashCommandMenu'
export default SlashCommandMenu
