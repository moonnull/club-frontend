/** 리치 텍스트(HTML)의 실제 글자 수. 태그와 엔티티를 제외하고 센다. */
export function textLength(html: string): number {
  if (!html) return 0
  if (typeof document === 'undefined') {
    // SSR에서는 DOM이 없으므로 태그만 제거한 근사치를 쓴다.
    return html.replace(/<[^>]*>/g, '').trim().length
  }
  const el = document.createElement('div')
  el.innerHTML = html
  return (el.textContent ?? '').trim().length
}
