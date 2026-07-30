import RichTextEditor from './RichTextEditor'

const IMAGE_TOKEN = /(!\[[^\]]*\]\([^)]+\))/g
const IMAGE_MATCH = /^!\[([^\]]*)\]\(([^)]+)\)$/
// 리치 텍스트 에디터(Tiptap)로 작성된 글은 HTML 태그를 포함한다. 이전
// 방식(일반 텍스트 + ![alt](url) 토큰)으로 작성된 글과 구분해서 렌더링한다.
const HTML_TAG = /<[a-z][\s\S]*>/i

export function isRichTextContent(content: string): boolean {
  return HTML_TAG.test(content)
}

export default function PostContent({ content }: { content: string }) {
  if (isRichTextContent(content)) {
    return <RichTextEditor content={content} editable={false} />
  }

  const parts = content.split(IMAGE_TOKEN)
  return (
    <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
      {parts.map((part, i) => {
        const match = part.match(IMAGE_MATCH)
        if (match) {
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={match[2]} alt={match[1]} className="max-w-full rounded-lg my-2" />
          )
        }
        return <span key={i}>{part}</span>
      })}
    </div>
  )
}
