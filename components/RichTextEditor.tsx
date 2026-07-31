'use client'
import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { createLowlight, common } from 'lowlight'
import { useEffect, useRef } from 'react'
import { uploadFile } from '@/lib/api/uploads'
import { SlashCommand } from './slashCommandExtension'
import styles from './RichTextEditor.module.css'

const lowlight = createLowlight(common)

export default function RichTextEditor({
  content,
  onChange,
  editable = true,
  placeholder = "'/'를 입력하여 작성을 시작해보세요.",
  fullHeight = false,
}: {
  content: string
  onChange?: (html: string) => void
  editable?: boolean
  placeholder?: string
  fullHeight?: boolean
}) {
  const insertImageRef = useRef<((url: string) => void) | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    editable,
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      CodeBlockLowlight.configure({ lowlight }),
      Image,
      Placeholder.configure({ placeholder }),
      ...(editable
        ? [
            SlashCommand.configure({
              onImage: (insert) => {
                insertImageRef.current = insert
                fileInputRef.current?.click()
              },
            }),
          ]
        : []),
    ],
    content,
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
    // 주의: editorProps에 undefined를 넘기면 Tiptap 기본값({})을 덮어써서
    // 에디터 생성 시점에 크래시가 난다. 항상 객체를 넘기고 내부에서 분기한다.
    editorProps: {
      handlePaste: (view, event) => {
        if (!editable) return false
        const imageItem = Array.from(event.clipboardData?.items ?? []).find((item) =>
          item.type.startsWith('image/')
        )
        const file = imageItem?.getAsFile()
        if (!file) return false
        event.preventDefault()
        uploadFile(file)
          .then((result) => {
            const node = view.state.schema.nodes.image.create({ src: result.url })
            view.dispatch(view.state.tr.replaceSelectionWith(node))
          })
          .catch((err: unknown) => alert(err instanceof Error ? err.message : '이미지 업로드에 실패했습니다.'))
        return true
      },
    },
  })

  useEffect(() => {
    if (!editor || editor.isFocused) return
    if (content !== editor.getHTML()) editor.commands.setContent(content)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, editor])

  async function handleImageFile(files: FileList | null) {
    const file = files?.[0]
    const insert = insertImageRef.current
    if (!file || !insert) return
    try {
      const result = await uploadFile(file)
      insert(result.url)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : '이미지 업로드에 실패했습니다.')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (!editor) return null

  return (
    <div
      className={`${editable ? 'border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2 bg-white dark:bg-[#1a1a1a]' : ''} ${
        fullHeight ? 'flex-1 min-h-0 flex flex-col' : ''
      }`}
    >
      {editable && (
        <BubbleMenu editor={editor}>
          <div className="flex items-center gap-1 bg-gray-900 dark:bg-white rounded-lg shadow-lg px-1 py-1">
            {[
              { label: 'B', mark: 'bold' as const, cmd: () => editor.chain().focus().toggleBold().run() },
              { label: 'I', mark: 'italic' as const, cmd: () => editor.chain().focus().toggleItalic().run() },
              { label: 'S', mark: 'strike' as const, cmd: () => editor.chain().focus().toggleStrike().run() },
            ].map((b) => (
              <button
                key={b.label}
                type="button"
                onClick={b.cmd}
                className={`w-7 h-7 text-xs font-semibold rounded transition ${
                  editor.isActive(b.mark)
                    ? 'bg-indigo-500 text-white'
                    : 'text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-200'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </BubbleMenu>
      )}
      <EditorContent
        editor={editor}
        className={`${styles.content} ${fullHeight ? `${styles.fullHeight} flex-1 min-h-0 overflow-y-auto` : ''}`}
      />
      {editable && (
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.gif,.webp"
          hidden
          onChange={(e) => handleImageFile(e.target.files)}
        />
      )}
    </div>
  )
}
