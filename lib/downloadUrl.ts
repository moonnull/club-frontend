// Cloudinary URL에 fl_attachment 플래그를 넣어 브라우저가 (미리보기 대신)
// 바로 다운로드하도록 만든다. 원본 파일명을 유지하기 위해 확장자를 뺀
// 이름을 fl_attachment:<filename> 형태로 지정한다.
export function toDownloadUrl(url: string, filename: string): string {
  const baseName = filename.replace(/\.[^./]+$/, '')
  if (!url.includes('/upload/') || !baseName) return url
  return url.replace('/upload/', `/upload/fl_attachment:${encodeURIComponent(baseName)}/`)
}
