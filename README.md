# Chimera Club Frontend

동아리 웹사이트 프론트엔드. Next.js 14 (App Router) + Tailwind CSS 기반이며, `club-backend` (FastAPI) API를 사용합니다.

## 기술 스택

- **Next.js 14** (App Router, Client Components 위주)
- **Tailwind CSS** — 스타일링, 다크모드는 `class` 전략 (`ThemeToggle` 컴포넌트가 `html.dark` 토글)
- **Tiptap 3** — 리치텍스트 에디터 (과제 작성용), 슬래시(`/`) 명령어로 제목·목록·인용구·코드블록·구분선·이미지 삽입 지원, 텍스트 선택 시 굵게/기울임/취소선 버블 메뉴
- 배포: Vercel

## 현재 구현된 페이지 / 기능

### 공통
- `Navbar` — 공지사항 / 게시판 / 과제 / 일정 / 포트폴리오 / (관리자에게만) 관리자 메뉴
- `AuthGuard` — 로그인 필요 페이지 보호
- 로그인/회원가입 (`/login`, `/signup`) — 가입 시 관리자 승인 대기 상태로 시작

### 공지사항 (`/notices`)
- 게시판(`/posts`)과 완전히 분리된 전용 영역 (목록/작성/상세/수정)
- 관리자만 작성 가능, 댓글은 전체 회원 가능

### 게시판 (`/posts`)
- 게시판 카테고리를 `/api/boards`에서 동적으로 불러와 사이드바/글쓰기 드롭다운 구성 (공지사항 카테고리는 제외 — `/notices`에서 별도 관리)
- 게시글 작성 시 파일 첨부(pdf/zip/이미지) + 본문 이미지 삽입(마크다운 `![image](url)` 형식)
- 댓글, Q&A 게시판은 답변 채택 가능
- 작성자 본인 또는 관리자만 수정/삭제 가능

### 과제 (`/assignments`)
- `layout.tsx`가 좌측에 전체 과제 목록을 고정 사이드바로 표시 (모든 하위 페이지에서 유지)
- 과제 상세(`/assignments/[id]`)는 **가운데(과제 내용) | 오른쪽(제출 작성 / 제출 현황 / 질문 탭)** 2분할 레이아웃, 경계선 드래그로 폭 조절 가능
  - **제출 작성**: 제목 입력 + Tiptap 리치텍스트 본문 + 첨부파일, 임시저장/최종제출 (마감 전까지 재수정 가능)
  - **제출 현황**: 최종 제출된 제출물을 전체 회원 공개 목록으로 표시 (제목/작성자/합격·불합격 배지/댓글 수)
  - **질문**: 과제 자체에 대한 Q&A 스레드
- 제출물 상세(`/assignments/[id]/submissions/[submissionId]`) — 리치텍스트 본문, 첨부파일, 관리자 전용 합격/불합격 판정, 댓글(리치텍스트+파일첨부)
- 과제 등록/수정은 관리자(또는 작성자)만 접근 가능

### 일정 (`/events`)
- 일정 목록, 출석 체크, 개인 출석률 표시

### 포트폴리오 (`/projects`)
- 프로젝트 목록/등록 (기수·기술스택 필터)

### 관리자 (`/admin`)
- 회원 승인 대기 목록 / 전체 회원 (역할 변경, 삭제)
- 게시판 카테고리 관리 (추가/이름 수정/관리자 전용 토글/삭제 — NOTICE는 삭제 불가)

## 아키텍처: 페이지는 도메인별 API 모듈만 호출

Next.js App Router는 `app/**/page.tsx` 파일 위치가 라우팅을 결정하므로 페이지 파일 자체를 계층별로 옮길 수는 없지만, **데이터 접근 로직은 페이지에서 분리**되어 있고 **새 기능을 추가할 때도 이 규칙을 그대로 따릅니다.**

- 페이지/컴포넌트는 `fetch`나 `/api/...` 원시 경로를 직접 다루지 않고, `lib/api/<domain>.ts`가 export하는 타입이 있는 함수(`listPosts()`, `createAssignment()` 등)만 호출
- `lib/api/client.ts` — 저수준 fetch 래퍼 (JSON/form-urlencoded/multipart 자동 처리, 인증 토큰 첨부). 도메인 모듈들이 내부적으로만 이걸 사용하고, 페이지는 직접 쓰지 않음
- `lib/api/<domain>.ts` (auth, posts, boards, assignments, events, projects, admin, uploads) — 도메인별 엔드포인트 호출 함수. `/notices`는 별도 모듈 없이 `posts.ts`를 `board_type: 'NOTICE'`로 재사용
- `lib/session.ts` — localStorage 기반 로그인 세션 헬퍼 (`saveAuth`/`clearAuth`/`getStoredUser`), 네트워크 호출이 아니라서 `lib/api/`와 분리

새 기능을 추가할 때는 백엔드에 대응하는 엔드포인트가 생기면 먼저 `lib/api/<domain>.ts`에 함수를 추가하고, 페이지는 그 함수만 호출하도록 만듭니다.

## 프로젝트 구조

```
app/
  assignments/    과제 목록/상세/작성/수정/제출물 (layout.tsx가 좌측 사이드바 공통 레이아웃)
  notices/        공지사항 (게시판과 분리된 전용 영역)
  posts/          게시판 (공지 제외 카테고리)
  events/         일정/출석
  projects/       포트폴리오
  admin/          관리자 페이지
  login/, signup/ 인증
components/
  RichTextEditor.tsx        Tiptap 기반 에디터 (읽기 전용 모드로 렌더링에도 재사용)
  slashCommandExtension.ts  '/' 슬래시 명령어 확장
  SlashCommandMenu.tsx      슬래시 명령어 팝업 메뉴
  AttachmentPicker.tsx      파일 첨부 UI (pdf/zip/이미지)
  ImageInsertButton.tsx     본문 이미지 삽입 버튼 (마크다운 텍스트에어리어용)
  PostContent.tsx           게시글 본문 렌더링 (인라인 이미지 마크다운 파싱)
  Navbar.tsx, AuthGuard.tsx, ThemeToggle.tsx
lib/
  api/client.ts       저수준 fetch 래퍼 (도메인 모듈 전용, 페이지에서 직접 사용 안 함)
  api/<domain>.ts     도메인별 API 함수 (auth/posts/boards/assignments/events/projects/admin/uploads)
  session.ts          로그인 세션 localStorage 헬퍼
  types.ts             API 응답 타입 정의
  formatDeadline.ts     제출 기한 문자열 포맷 ("YYYY-MM-DD ~ YYYY-MM-DD HH:mm (n주)")
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

Vercel 사용. `club-backend`의 CORS 설정이 `club-frontend-*-ch1mera.vercel.app` 형태의 모든 배포(프로덕션/브랜치/프리뷰)를 정규식으로 허용하도록 되어 있습니다.

## 앞으로 추가될 수 있는 내용

이 섹션은 새 기능이 추가될 때마다 갱신 예정입니다.
