---
title: "Next.js 버전업 후 정적파일 CORS 에러"
description: "Next.js 12에서 13으로 버전업 후 발생한 정적파일 CORS 에러의 원인과 해결 과정을 공유합니다."
publishDate: "2024-02-28"
tags: ["nextjs"]
lang: "ko"
translationSlug: "nextjs-cors-upgrade-bug-en"
---

![CORS 에러 발생](./img1.png)

금일 정기배포 이후 www.creatrip~ 에서 요청하는 js chunk 파일에 대한 CORS 에러가 발생했다.

이 얼마 만에 보는 CORS 에러란 말인가...!

우리 회사에서는 nextjs 빌드 후 생성된 정적 파일은 s3 - cloudfront를 통해서 캐싱 후 제공하고 있는데, 배포 전 후로 설정을 바꾼 부분은 없는 상황이었다.

일단 cdn에서 제공하는 정적 파일에 대한 응답 헤더에 정책을 생성하고, 해당 정책에서 www가 붙은 도메인, 붙지 않은 도메인에 대해 모두 오리진을 추가해서 대응해 주었다.

빠르게 대응은 했는데, 대체 왜 갑자기 문제가 생긴 것인지 파악을 하기가 여간 쉽지 않았다.

처음에는 해당 이슈가 배포 직후에 발생한 문제인지에 대한 확신도 서지 않았고, SSG 등으로 생성된 정적 페이지에서는 해당 이슈가 없는 부분도 의아했다.

![Origin 헤더 차이](./img2.png)

가장 먼저 발견한 차이점은 Origin 헤더의 유무였는데, CORS 문제가 생기는 자원들은 모두 요청 헤더에 Origin 값을 보내고 있다는 점이 달랐다.

대체 원인이 뭔지 끙끙대던 중, 훌륭하신 팀원 한 분이 관련 이슈를 찾아주셔서 사건의 전말을 파악할 수 있었다.

https://github.com/vercel/next.js/issues/34225#issuecomment-1804831899

요점만 정리하자면 다음과 같다.

1. 이번 정기 배포 전의 next 버전은 12.3.4였다.
2. 해당 버전에서는 CSR 페이지들의 script 태그에 crossorigin 속성이 없었다.
3. 12.3.4 버전의 코드에서 [crossOrigin을 선언하는 곳](https://github.com/vercel/next.js/blob/v12.3.4/packages/next/build/webpack-config.ts#L982)과 [넘기는 곳](https://github.com/vercel/next.js/blob/v12.3.4/packages/next/build/webpack-config.ts#L1986)을 보면 next.config 내부의 crossOrigin 값이 없는 경우 undefined를 그대로 넘기는 것을 알 수 있다.
4. 그런데 버전업 이후 [Next 13.5.6에서는 next.config의 crossOrigin이 없을 경우 빈 문자열을 넣어](https://github.com/vercel/next.js/blob/v13.5.6/packages/next/src/export/index.ts#L499)준다...!
5. 그리고 이렇게 들어간 crossOrigin 값은 script 렌더링시에 사용되는데, [이 버그](https://github.com/vercel/next.js/issues/53190)를 수정하기 위해 [이 PR](https://github.com/vercel/next.js/pull/56311)에서 작업되었다. 따라서 config의 crossOrigin 값이 없는 경우, getRequiredScripts 로직을 통해 생성되는 script tag에는 무조건 crossOrigin이 붙게 되는 버그(?)가 생긴 것이다. (그리고 해당 버그는 [13.5.4-canary.10](https://github.com/vercel/next.js/releases/tag/v13.5.4-canary.10)에 머지되었다)
6. [crossOrigin attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/crossorigin)는 일부 동적 스크립트에 사용되며 element의 리소스 요청 시 CORS 요청을 사용할 수 있게 만드는 속성이다.
7. crossorigin 속성이 아예 없는 경우에는 CORS 요청을 하지 않지만, 빈 문자열일 경우 기본값인 anonymous를 사용하게 되며 anonymous에서는 CORS 요청의 credentials flag가 'same-origin'으로 지정되면서 CORS 요청이 발생한다.
8. 즉, 버그다.

![리팩토링 과정에서의 버그](./img3.png)

renderOpt라는 속성을 리팩토링 하면서 crossOrigin에 대한 기본값을 빈 문자열로 넣어버렸고, 추후 버그를 수정하면서 해당 옵션의 crossOrigin 값을 script의 속성으로 그대로 사용해 버린... 버그인 것이다.

nextjs에 기여할 수 있는 기회인가? 싶어서 살펴봤는데 벌써 [수정 PR이](https://github.com/vercel/next.js/pull/58200) 작년 11월에 올라와 있었다.

왜 머지가 안 되고 있는지는 모르겠다.

비슷한 이슈를 마주한다면 일단 cdn에서 응답 헤더 정책에 SimpleCORS 혹은 커스텀 정책으로 도메인에 해당하는 origin을 allow 해서 해결해 보자.

---

이 글은 미디엄에도 게재되었습니다:

https://medium.com/creatrip/next-js-%EB%B2%84%EC%A0%84%EC%97%85-%EC%9D%B4%ED%9B%84-%EC%85%80%ED%94%84-%ED%98%B8%EC%8A%A4%ED%8C%85-%ED%99%98%EA%B2%BD%EC%97%90%EC%84%9C%EC%9D%98-cors-b7f7192bb9c4
