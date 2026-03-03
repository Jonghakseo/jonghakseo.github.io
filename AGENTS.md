# AGENTS.md

## 프로젝트 한눈에 보기

- 정적 블로그 프로젝트(Astro 3 기반)이며, `astro-theme-cactus` 템플릿을 커스터마이징해 사용.
- 배포 도메인: `https://jonghakseo.github.io/` (`astro.config.ts`)
- 핵심 스택: Astro + TypeScript + TailwindCSS + MD/MDX + Content Collections + Pagefind 검색.

## 루트 구조

- `src/`: 애플리케이션 소스(페이지/레이아웃/컴포넌트/콘텐츠/유틸)
- `public/`: 정적 자산(파비콘, 폰트, manifest, robots 등)
- `.github/workflows/`: 배포/자동화 워크플로
- 설정 파일: `astro.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `tsconfig.json`
- 패키지: `package.json` (패키지 매니저 `pnpm@9.15.9`)

## src 상세 구조

- `src/pages/`: 라우트 엔트리
  - `index.astro`, `about.astro`, `404.astro`
  - `posts/[...page].astro`: 포스트 목록 페이지네이션
  - `posts/[slug].astro`: 포스트 상세
  - `tags/index.astro`, `tags/[tag]/[...page].astro`: 태그 목록/페이지네이션
  - `og-image/[slug].png.ts`: Satori 기반 OG 이미지 생성
  - `rss.xml.ts`: RSS 생성
- `src/layouts/`: 공통 레이아웃 (`Base.astro`, `BlogPost.astro`)
- `src/components/`: UI 컴포넌트
  - 공통: `BaseHead`, `Header`, `Footer`, `ThemeToggle`, `Search`, `Paginator` 등
  - 블로그 전용: `components/blog/*` (Hero, TOC, PostPreview)
- `src/content/`: 콘텐츠 컬렉션
  - `config.ts`: `post` 컬렉션 스키마(zod)
  - `post/`: 실제 게시글(md)
  - `post-legacy/`: 이전 글/샘플성 콘텐츠
- `src/utils/`: 날짜/포스트 정렬/TOC 생성/reading-time remark 플러그인
- `src/site.config.ts`: 사이트 메타(author/title/description/menu/date 포맷)

## 콘텐츠/스키마 규칙

- 컬렉션: `post` 단일 컬렉션 중심.
- 주요 frontmatter: `title`, `description`, `publishDate`, `updatedDate?`, `tags[]`, `coverImage?`, `ogImage?`.
- 태그는 소문자 + 중복 제거 transform 적용(`src/content/config.ts`).

## 빌드/개발 커맨드

- `pnpm dev`: 로컬 개발 서버
- `pnpm build`: 프로덕션 빌드
- `pnpm postbuild`: Pagefind 인덱싱(`dist` 대상)
- `pnpm preview`: 빌드 결과 미리보기
- `pnpm format`: Prettier 포맷

## 동작 포인트(변경 시 자주 보는 곳)

- 사이트 메타/메뉴: `src/site.config.ts`
- 도메인/마크다운 플러그인: `astro.config.ts`
- 포스트 스키마: `src/content/config.ts`
- SEO Head: `src/components/BaseHead.astro`
- 포스트 리스트/정렬 로직: `src/utils/post.ts`

## 참고

- README는 원본 테마 설명이 많이 남아있어, 실제 동작은 위 파일들을 기준으로 판단하는 것이 정확함.
