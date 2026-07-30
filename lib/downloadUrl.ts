// Cloudinary URL에 fl_attachment 플래그를 넣어 브라우저가 (미리보기 대신)
// 바로 다운로드하도록 만든다.
// 주의: Cloudinary는 fl_attachment 값에 공백이나 한글 등 비ASCII 문자가
// 있으면 인코딩 여부와 무관하게 변환 파싱에 실패해 400을 반환한다
// (직접 확인함). 영문/숫자/_/- 만 남기고, 다 걸러지면 기본값을 쓴다.
// 화면에 보이는 파일명(링크 텍스트)은 원본 그대로이므로, 실제
// 다운로드되는 파일의 내부 이름만 단순화되는 정도의 손해다.
export function toDownloadUrl(url: string, filename: string): string {
  const baseName = filename.replace(/\.[^./]+$/, '')
  const safeName = baseName.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 100) || 'file'
  if (!url.includes('/upload/')) return url
  return url.replace('/upload/', `/upload/fl_attachment:${safeName}/`)
}
