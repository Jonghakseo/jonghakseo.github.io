# jonghakseo.github.io

[JongHak's Blog](https://jonghakseo.github.io/) — 개인 블로그 소스입니다. Astro로 정적 사이트를 빌드해 GitHub Pages에 배포합니다.

## Stack

- [Astro](https://astro.build/) 4 + TypeScript
- [TailwindCSS](https://tailwindcss.com/)
- Content Collections (MD / MDX)
- [Pagefind](https://pagefind.app/) 정적 검색
- [Satori](https://github.com/vercel/satori) 기반 OG 이미지 자동 생성

## Commands

패키지 매니저는 `pnpm`(`packageManager` 필드에 고정), Node 버전은 `.nvmrc` 기준입니다.

| Command          | Action                                    |
| :--------------- | :---------------------------------------- |
| `pnpm install`   | 의존성 설치                               |
| `pnpm dev`       | 로컬 개발 서버 실행                       |
| `pnpm build`     | `./dist`로 프로덕션 빌드                  |
| `pnpm postbuild` | Pagefind 검색 인덱스 생성 (build 후 자동) |
| `pnpm preview`   | 빌드 결과 로컬 미리보기                   |
| `pnpm lint`      | ESLint 검사                               |
| `pnpm format`    | Prettier 포맷                             |

## Structure

```
src/
├── pages/          # 라우트 (index, about, posts, tags, rss.xml, og-image)
├── layouts/        # Base, BlogPost 레이아웃
├── components/     # 공통 UI + blog 전용 컴포넌트
├── content/post/   # 블로그 글 (디렉터리명 = slug)
├── utils/          # 날짜/포스트 정렬/TOC/reading-time
└── site.config.ts  # 사이트 메타 및 메뉴
public/             # 정적 자산 (favicon, fonts, resume 등)
```

주요 설정 파일: `astro.config.ts` (도메인·마크다운 플러그인), `src/content/config.ts` (포스트 스키마), `tailwind.config.ts`

## Writing a post

`src/content/post/<slug>/index.md`를 추가하면 디렉터리명이 그대로 URL slug가 됩니다. 스키마는 `src/content/config.ts`에서 zod로 검증합니다.

| Property (\* required) | Description                                     |
| ---------------------- | ----------------------------------------------- |
| `title` \*             | 최대 60자                                       |
| `description` \*       | 20~160자. SEO description으로 사용              |
| `publishDate` \*       | `YYYY-MM-DD`                                    |
| `updatedDate`          | 지정하면 목록 정렬이 이 값을 우선 사용          |
| `tags`                 | 소문자로 정규화 + 중복 제거                     |
| `coverImage`           | `{ src, alt }`                                  |
| `ogImage`              | 생략하면 Satori로 자동 생성                     |
| `lang`                 | `ko` \| `en` (기본 `en`)                        |
| `translationSlug`      | 번역본 slug. 지정 시 본문 상단에 언어 토글 노출 |
| `translationQuality`   | `draft` \| `reviewed` \| `final`                |

### 번역본

번역본은 별도 글로 노출되지 않고 원문 페이지의 언어 토글로 전환됩니다.

- 원문(예: `my-post`)에 `translationSlug: "my-post-en"`을 지정
- 번역본(`my-post-en`)은 `lang`과 `translationQuality`만 지정하고 `translationSlug`는 비워둠
- 번역본은 목록·RSS·사이트맵에서 제외되고 `/translations/<slug>/`로만 빌드됨

## Deploy

`main`에 push하면 `.github/workflows/deploy.yml`이 사이트를 빌드해 GitHub Pages로 배포합니다.

## Credit

[astro-theme-cactus](https://github.com/chrismwilliams/astro-theme-cactus)를 기반으로 커스터마이징했습니다.

## License

MIT
