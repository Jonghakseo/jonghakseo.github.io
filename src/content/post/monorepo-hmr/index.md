---
title: "모노레포에서 HMR 지원하기"
description: "모노레포 환경에서 내부 패키지의 HMR이 동작하지 않는 문제를 resolve alias로 해결하는 방법을 소개합니다."
publishDate: "2024-11-16"
tags: ["developer-tools"]
lang: "ko"
translationSlug: "monorepo-hmr-en"
---

우리 회사의 프론트엔드 레포는 모노레포 환경으로 동작하고 있다. 작년 9월쯤 터보레포 기반의 모노레포로 전환했고, 올해 3월에 pnpm을 적용했다.

모노레포를 적용하면서 패키지로 추출한 ui, animation 의 경우 해당 패키지의 진입점이 빌드 후 결과물로 명시되어 HMR 동작에 어려움을 겪게 되었다. 사실 일반적인 개발 환경에서는 문제가 없지만, ui 패키지 등을 수정하면서 작업해야 하는 Storybook과 같은 환경에서는 치명적이다.

예를 들어 다음과 같은 경우를 생각해보자.

1. Storybook - dev 실행
2. ui 패키지의 Button 스타일 변경
3. ui 패키지 re-build
4. Storybook 에서 ui 패키지의 변경사항 감지
5. Full Reload

vite의 react plugin 내부에 꼭꼭 숨어있는, 보통은 캡슐화되어 숨겨져있는 HMR 기능의 동작은 대략적으로 다음과 같다.

1. 모듈의 의존관계를 파악
2. 모듈의 의존성 트리를 조회하면서 변경사항을 감지하고 외부에 알리는 HMR 스크립트를 inject
3. 특정 모듈에 변경사항이 생기면 HMR 스크립트에서 감지 후 해당 모듈만 리로드 + 캐시 무효화

2번 항목에서 외부 의존성에 해당하는 모듈인지 내부 소스코드인지 판별 후 inject를 하게 되는데, 문제는 모노레포 환경에서는 특정 패키지가 외부 의존성인지 아닌지를 꼼꼼하게 발라낼 정도로 해당 로직이 똑똑하지 않다는 점이다.

이 문제를 빠르게 해결할 수 있는 방법이 무엇일까?

개발 환경에서는 외부 모듈이 아닌 내부 의존성임을 HMR 로직에 알려주면 된다. 그걸 어떻게?

```ts
import { type AliasOptions, defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const isDev = process.env.NODE_ENV === 'development';

const devAliases = {
  // 개발 환경에서 패키지들의 HMR을 지원하기 위해 로컬 경로를 통해 참조
  '@ui': path.resolve(__dirname, '../../packages/ui/index'),
  '@icon': path.resolve(__dirname, '../../packages/icon/index'),
  '@style': path.resolve(__dirname, '../../packages/style/index'),
} satisfies AliasOptions;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: isDev ? devAliases : undefined,
  },
});
```

심플하게 이렇게 알려주면 된다!

예시에서는 vite의 resolve.alias 를 사용했지만 webpack 등 다른 설정 환경에서도 유효한 해결책이다.

**로컬 경로를 통해 참조할때 명시적으로 index.ts 등의 진입점을 꼭! 명시해줘야 한다. 그렇지 않으면 해당 패키지에 있는 package.json의 진입점을 통해 모듈을 파악하기 때문에 의도와 달리 HMR이 제대로 동작하지 않는다.**

HMR의 기본적인 동작에 대해 살펴본 경험, JS 환경에서 모듈 리졸버에 대한 기본적인 로직을 알고 있다면 다음과 같이 간단한 해결책으로 모노레포 환경에서의 HMR 지원을 추가할 수 있다. :)
