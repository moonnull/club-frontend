# Chimera Club Frontend

동아리 웹사이트 프론트엔드. Next.js 14 (App Router) + Tailwind CSS 기반이며, `club-backend` (FastAPI) API를 사용합니다.

## 기술 스택

- **Next.js 14** (App Router, Client Components 위주)
- **Tailwind CSS** — 스타일링, 다크모드는 `class` 전략 (`ThemeToggle` 컴포넌트가 `html.dark` 토글)
- **Tiptap 3** — 리치텍스트 에디터. 슬래시(`/`) 명령어로 제목·목록·인용구·코드블록·구분선·이미지 삽입, 클립보드에 이미지를 붙여넣으면(Ctrl/Cmd+V) 자동 업로드 후 삽입, 텍스트 선택 시 굵게/기울임/취소선 버블 메뉴. 과제/게시판/공지사항 작성에 공통 사용
- 배포: Vercel

## 현재 구현된 페이지 / 기능

### 공통
- `Navbar` — 공지사항 / 게시판 / 과제 / 캘린더 / (관리자에게만) 관리자 메뉴 + 알림 벨(읽지 않은 개수 배지, 드롭다운으로 목록 확인·읽음 처리)
- `AuthGuard` — 로그인 필요 페이지 보호. 세션이 만료되면(401) 자동 로그아웃 후 로그인 페이지로 이동
- 로그인/회원가입 (`/login`, `/signup`) — 가입 시 관리자 승인 대기 상태로 시작
- 비밀번호 찾기(`/forgot-password`) → 이메일 재설정 링크 → 새 비밀번호 설정(`/reset-password`)
- 내 정보 수정(`/profile`) — 이름/비밀번호 변경 (네비바에서 본인 이름 클릭)

### 공지사항 (`/notices`)
- 게시판(`/posts`)과 완전히 분리된 전용 영역 (목록/작성/상세/수정)
- 관리자만 작성 가능, 댓글은 전체 회원 가능, 게시 시 전체 회원에게 알림 발송

### 게시판 (`/posts`)
- 게시판 카테고리를 `/api/boards`에서 동적으로 불러와 사이드바/글쓰기 드롭다운 구성 (공지사항 카테고리는 제외)
- 게시글 작성은 리치텍스트 에디터(이미지 붙여넣기/슬래시 명령어) + 파일 첨부(pdf/zip/이미지)
  - **리치텍스트 도입 이전에 작성된 글**은 예전 형식(일반 텍스트 + `![image](url)` 토큰)으로 저장되어 있는데, `PostContent` 컴포넌트가 내용이 HTML인지 예전 형식인지 자동 판별해서 각각 맞는 방식으로 렌더링/수정 화면을 보여줌 (기존 글이 깨지지 않음)
- 댓글 작성 시 글쓴이에게 알림 발송, Q&A 게시판은 답변 채택 가능
- 작성자 본인 또는 관리자만 수정/삭제 가능
- 첨부파일 링크는 클릭 시 미리보기 대신 바로 다운로드 (Cloudinary `fl_attachment`)

### 과제 (`/assignments`)
- `layout.tsx`가 좌측에 전체 과제 목록을 고정 사이드바로 표시 (모든 하위 페이지에서 유지)
- 과제 상세(`/assignments/[id]`)는 **가운데(과제 내용) | 오른쪽(제출/질문)** 2분할 레이아웃, 경계선 드래그로 폭 조절 가능. 오른쪽 패널은 전부 페이지 이동 없이 그 안에서만 상태가 바뀜(목록 ↔ 작성 ↔ 상세):
  - **제출**: 제목 + 리치텍스트 본문 + 첨부파일로 임시저장/최종제출(마감 전까지 재수정 가능). 최종 제출 후에는 읽기 전용으로 보이고 "수정" 버튼으로 다시 편집 가능
  - **제출 현황**: 제출 마감 이후에만 다른 회원의 제출물이 공개(목록·상세·댓글·관리자 합격/불합격 판정). 관리자와 본인은 마감 전에도 열람 가능
  - **질문**: 제목 있는 Q&A 스레드, 관리자가 답변하면 "답변됨" 표시
- 과제 등록/수정은 관리자(또는 작성자)만 접근 가능

### 캘린더 (`/calendar`)
- 월간 그리드에 과제 마감일이 함께 표시됨
- 로그인한 회원이면 누구나 빈 날짜를 클릭해 그 자리에서 바로 할일/메모 추가 가능(노션 스타일 인라인 입력), 체크박스로 완료 표시. 전체 공개, 작성자 본인/관리자만 삭제 가능

### 관리자 (`/admin`)
- 회원 승인 대기 목록 / 전체 회원 (역할 변경, **비밀번호 강제 초기화**, **개인 알림 발송**, 삭제)
- 게시판 카테고리 관리 (추가/이름 수정/관리자 전용 토글/삭제 — NOTICE는 삭제 불가)

## 아키텍처: 페이지는 도메인별 API 모듈만 호출

Next.js App Router는 `app/**/page.tsx` 파일 위치가 라우팅을 결정하므로 페이지 파일 자체를 계층별로 옮길 수는 없지만, **데이터 접근 로직은 페이지에서 분리**되어 있고 **새 기능을 추가할 때도 이 규칙을 그대로 따릅니다.**

- 페이지/컴포넌트는 `fetch`나 `/api/...` 원시 경로를 직접 다루지 않고, `lib/api/<domain>.ts`가 export하는 타입이 있는 함수(`listPosts()`, `createAssignment()` 등)만 호출
- `lib/api/client.ts` — 저수준 fetch 래퍼 (JSON/form-urlencoded/multipart 자동 처리, 인증 토큰 첨부, 401 응답 시 자동 로그아웃). 도메인 모듈들이 내부적으로만 이걸 사용하고, 페이지는 직접 쓰지 않음
- `lib/api/<domain>.ts` (auth, posts, boards, assignments, calendar, notifications, admin, uploads) — 도메인별 엔드포인트 호출 함수. `/notices`는 별도 모듈 없이 `posts.ts`를 `board_type: 'NOTICE'`로 재사용
- `lib/session.ts` — localStorage 기반 로그인 세션 헬퍼 (`saveAuth`/`clearAuth`/`getStoredUser`). `saveAuth`/`clearAuth`는 `auth-changed` 커스텀 이벤트를 발생시켜 `Navbar`가 페이지 이동 없이도 로그인 상태 변화를 즉시 반영하도록 함

새 기능을 추가할 때는 백엔드에 대응하는 엔드포인트가 생기면 먼저 `lib/api/<domain>.ts`에 함수를 추가하고, 페이지는 그 함수만 호출하도록 만듭니다.

## 프로젝트 구조

```
app/
  assignments/       과제 목록/상세/작성/수정 (layout.tsx가 좌측 사이드바 공통 레이아웃, 제출/질문은 상세 페이지 안에서 전부 처리)
  notices/           공지사항 (게시판과 분리된 전용 영역)
  posts/             게시판 (공지 제외 카테고리)
  calendar/          월간 캘린더 (과제 마감 + 개인 할일)
  admin/             관리자 페이지
  profile/           내 정보 수정
  login/, signup/, forgot-password/, reset-password/   인증
components/
  RichTextEditor.tsx        Tiptap 기반 에디터 (읽기 전용 모드로 렌더링에도 재사용, 이미지 붙여넣기 지원)
  slashCommandExtension.ts  '/' 슬래시 명령어 확장
  SlashCommandMenu.tsx      슬래시 명령어 팝업 메뉴
  AttachmentPicker.tsx      파일 첨부 UI (pdf/zip/이미지)
  ImageInsertButton.tsx     리치텍스트 도입 이전 형식(예전 글 수정 화면)에서만 쓰는 이미지 삽입 버튼
  PostContent.tsx           게시글 본문 렌더링 — HTML(신규)/예전 마크다운 토큰 형식을 자동 판별
  Navbar.tsx, AuthGuard.tsx, ThemeToggle.tsx
lib/
  api/client.ts       저수준 fetch 래퍼 (도메인 모듈 전용, 페이지에서 직접 사용 안 함)
  api/<domain>.ts     도메인별 API 함수 (auth/posts/boards/assignments/calendar/notifications/admin/uploads)
  session.ts          로그인 세션 localStorage 헬퍼
  types.ts             API 응답 타입 정의
  formatDeadline.ts     제출 기한 문자열 포맷, 백엔드가 타임존 표기 없이 주는 UTC 시각을 안전하게 파싱하는 toDate() 포함
  downloadUrl.ts        첨부파일 링크를 Cloudinary fl_attachment 다운로드 URL로 변환 (파일명은 영문/숫자만 허용)
```

## 로컬 개발

```bash
npm install
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL 설정
npm run dev
```

### 환경 변수 (`.env.local`)

| 변수 | 설명 |
|---|---|
| `NEXT_PUBLIC_API_URL` | 백엔드 API 주소 (로컬 기본값 `http://localhost:8000`) |

## 배포

Vercel 사용. `club-backend`의 CORS 설정이 `club-frontend-*-ch1mera.vercel.app` 형태의 배포를 정규식으로 허용하고, 그 외에도 백엔드의 `FRONTEND_URL` 환경변수와 정확히 일치하는 도메인을 허용합니다.

## 알려진 제약 / 운영 시 참고할 점

- **커스텀 에러 화면(`error.tsx`/`global-error.tsx`)이 없습니다.** 예상 못 한 클라이언트 에러가 나면 Next.js 기본 "Application error" 백지 화면이 뜹니다.
- **자동화된 테스트가 없습니다.** 기능 검증은 매번 수동으로(Playwright 스크립트 등) 진행되어 왔고 저장소에 남아있지 않습니다.
- 첨부파일을 다운로드하면 실제 저장되는 파일의 내부 이름이 영문/숫자로 단순화됩니다 (한글 등 비ASCII 파일명은 Cloudinary의 `fl_attachment`가 거부함). 화면에 보이는 링크 텍스트는 원본 파일명 그대로입니다.
