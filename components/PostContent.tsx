const IMAGE_TOKEN = /(!\[[^\]]*\]\([^)]+\))/g
const IMAGE_MATCH = /^!\[([^\]]*)\]\(([^)]+)\)$/

export default function PostContent({ content }: { content: string }) {
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
