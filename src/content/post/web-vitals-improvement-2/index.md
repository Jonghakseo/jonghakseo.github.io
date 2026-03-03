---
title: "웹 바이탈 개선기 2편 - SSG 제거, SSR 전환"
description: "ECS 환경에서 ISR 캐시 미스 문제를 SSR + CDN 캐싱으로 해결한 웹 바이탈 개선 경험을 공유합니다."
publishDate: "2024-11-20"
tags: ["core web vitals"]
lang: "ko"
translationSlug: "web-vitals-improvement-2-en"
---

[지난 1편](/posts/web-vitals-improvement-1)에 이어 웹 바이탈 개선을 위해 했던 작업에 대해 이야기해보려고 한다.

### 2. SSG 제거, SSR 전환

두 번째 작업은 Next.js 환경에서의 기존의 SSG(ISR)를 모두 제거하고 SSR로 전환한 것이다.

언뜻 생각하면 SSG는 빌드 시점에 생성된 HTML이고, SSR은 유저의 요청이 있을 때 렌더링을 해서 제공하기 때문에 SSG가 SSR보다 더 빠를 수 없는데 무슨 소리지? 라는 생각이 든다.

이 작업의 배경에 대해 설명하자면 프로덕트의 배포 환경에 대한 부연 설명이 좀 필요한데, 간단하게 말해 프론트엔드 서버는 esc에 로드밸런싱이 되는 컨테이너들로 떠 있는 상황이었다. 이러한 환경에서의 SSG는 치명적인 문제가 있었으니... 유저의 매 요청이 ELB를 거쳐 각 인스턴스에 배분되다보니 우리가 기대한 ISR의 동작이 제대로 이뤄지지 않았다.

그럴 수 밖에 없는게 캐싱 단위가 Next.js 인데 App이 여러개 떠있으니 캐시가 제대로 적중할리가...

이 문제를 해결하기 위해 별의별 트리키한 해결책(노드 클러스터링으로 한 인스턴스에 여러 앱을 띄우기, shared storage를 만들어서 SSG 자원을 각 앱에서 공유하기)을 고민하던 중, 불현듯 깨달음을 얻었으니,

"그냥 더 앞단(CDN)에서 캐싱하고 인스턴스에서는 SSR로 주면 되는거 아녀?!"

그렇다. 어차피 본질이 캐싱이라면 Next.js 내부에서 하려고 눈물의 차력쇼를 할 필요가 없던 거였던 것이다.

SSG를 싹 다 날리고 cloudfront 캐싱을 위한 캐시 헤더(s-maxage)를 붙이고 배포를 하니... 아주 신세계였다.

```ts
export const setCDNCacheHeader = (res: ServerResponse, maxAge: number) => {
  // 1초 이내 요청은 로컬 캐시를 사용하고, 1초 이후에는 CDN 캐시를 사용한다.
  // 로컬 캐싱으로 발생할 수 있는 문제를 회피하고 컨텐츠의 최신화 여부를 CDN에 위임하는 방식.
  res.setHeader('Cache-Control', `public, max-age=1, s-maxage=${sMaxAge}`);
};

//...

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  //...
  setCDNCacheHeader(res, 60); // 1분 동안 cloudfront에 캐싱된다.
  //...
}
```

이 작업을 하면서 깨달음을 하나 얻었는데, 문제에 대한 해결책을 눈 앞의 틀에만 갇혀서 생각하지 않고 좀 더 거시적으로 바라봐야겠다는 것이었다. 캐싱 레이어를 CDN으로 옮기는 비교적 간단한 작업으로 유저들에게 많은 이점을 줄 수 있었는데, SSG의 최적화 자체에만 너무 매몰되어 있었던 것 같아 반성을 많이 했다.
