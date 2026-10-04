---
title: "LLM 보면서 배워야 하는 시기가 왔다"
description: "styled-components - Tailwind 마이그레이션을 Fable5와 함께 하며 관찰한 기록."
publishDate: "2026-06-12"
tags: ["ai", "tailwind", "migration", "Fable5"]
lang: "ko"
translationSlug: "agent-tailwind-parity-en"
---

styled-components를 Tailwind로 옮기면서, 변환 전후 화면이 같은지 검증하는 도구를 Fable5와 함께 만들었다. 처음에는 아이디어를 얻고 구현을 맡기는 정도로 생각했다.

그런데 작업을 지켜보다가 배울 점이 꽤 있다는 생각이 들었다. 특히 안 잡히는 오류 앞에서 코드를 고치기보다, 다음 실패 때 원인을 볼 수 있게 계측부터 추가하는 모습을 보면서 그랬다.

* * *

## 1,300개의 파일, 한 번의 실패 경험

크리에이트립 유저페이지는 올해로 5년 정도 된 코드베이스다. 처음부터 styled-components를 썼고, 1년 전부터 Tailwind로 조금씩 옮기고 있었다. 새 컴포넌트는 Tailwind로 만들고, 기존 스타일을 수정할 때도 가급적 함께 옮기는 식이었다.

그렇게 해도 styled-components 파일이 아직 1,300개 정도 남아있다. 변환할 파일도 많지만, 옮긴 뒤 화면이 그대로인지 확인하는 일이 더 어려웠다.

마이그레이션 자체는 이런 모양이다. 변환 전:

```tsx
const CurrentPointWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: ${getRem(32, 0, 24)};

  ${(p) => p.theme.media.desktop} {
    margin: ${getRem(0)};
  }
`;
```

변환 후:

```tsx
<div className="vstack mx-0 mt-32 mb-24 items-center desktop:m-0">
```

다섯 줄짜리 예제는 쉬워 보인다. 하지만 이런 선언이 수천 개고, 그중엔 child 셀렉터로 다른 컴포넌트의 내부 스타일을 덮는 것, 미디어쿼리가 min-width가 아니라 범위(680~919px)인 것, `styled(Component)`로 다른 styled 컴포넌트를 다시 감싼 것들이 섞여 있었다. 하나라도 미묘하게 어긋나면 화면이 깨지는데, 그걸 사람 눈으로 일일이 확인하기는 어렵다.

이런 문제 때문에 이전에도 AI의 도움을 받아 computed-style 스냅샷 기반의 컴포넌트 테스트를 만들어서 부분 마이그레이션을 진행한 적이 있다. 그런데 쓰면 쓸수록 해당 도구를 100% 신뢰하는데에 한계가 있었다. 컴포넌트를 격리하는 순간 CSS의 진짜 어려움(cascade, 상속, 부모의 후손 셀렉터가 자식을 덮는 문제)이 감지되지 않거나 왜곡되었다.

그 한계를 체감하고 있던 차에 fable5가 출시됐다. 이번에는 다를지? "유저페이지의 styled-components를 안전하게 마이그레이션하려면 어떤 방법이 필요할지 같이 고민해보자"로 시작했다. 최신 모델이고 제일 똑똑하다고 하니 문제 정의부터 같이 해보자는 심산이었다.

* * *

## 에이전트가 만든 검증 체계

논의를 몇 번 하지도 않았는데 에이전트가 `tw-parity`라는 페이지 레벨 트윈 diff 도구를 설계했다. 이 도구는 같은 페이지를 변환 전/후 두 버전으로 동시에 띄워서 통째로 비교한다. 사용법은 이렇다.

```bash
# base(development)와 head(PR 브랜치) 워크트리를 동시에 띄워 라우트 전체를 비교
pnpm -F web tw-parity run --route /mypage/point \
  --base-dir ~/.worktrees/product/tw-parity-base \
  --head-dir ~/.worktrees/product/feature-branch \
  --viewports mobile,tablet,desktop

# exit 0: diff 없음 / 1: diff 또는 커버리지 실패 / 2: 인프라 실패 또는 canary 미검출(결과 신뢰 불가)
```

컨셉이나 사용 방법만 보면 간단한데, 기저에 깔린 디테일들이 꽤 놀라움을 줬다. (이 글을 쓰게 된 이유이기도 하다)

- two-worktree 즉석 비교. 같은 머신, 같은 브라우저, 같은 폰트에서 동시에 렌더해서 DOM 트리 + 전 요소 computed style + `::before/::after`까지 비교한다. 스냅샷 파일은 저장하지 않는다. 저장된 기준선을 두면 OLD vs OLD를 비교하는 식의 거짓 통과가 생길 수 있어서였다.
- 노이즈 억제. GraphQL 응답은 도구 소유의 fixture로 인터셉트해서 양쪽에 동일하게 주입하고, 시간과 랜덤까지 고정한다.

```js
// installDeterminism — "비교 대상이 아닌 차이"는 애초에 발생할 수 없게
await context.addInitScript(({ fixedTime }) => {
  const fixedNow = new Date(fixedTime).valueOf();
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length > 0 ? args : [fixedNow])); }
    static now() { return fixedNow; }
  }
  window.Date = FixedDate;
  Math.random = () => 0.123456789;
}, { fixedTime: FIXED_TIME });
```

또 매번 head 소스에 일부러 1px 차이를 만들고, 비교 도구가 그걸 잡는지 확인한 뒤 되돌린다. canary 검증이다. diff가 0이라는 결과만으로는 정말 같은 건지, 검사가 아무것도 못 보고 있는 건지 알 수 없다. 이런 검증을 넣으라고 따로 지시한 적은 없다.

```js
// 변형 전략: styled 파일은 getRem 숫자를, 변환 완료 파일은 Tailwind spacing 토큰을 +1
const MUTATION_STRATEGIES = [
  { name: 'getRem', pattern: /getRem\(\s*(\d+(?:\.\d+)?)/ },
  // (?<!:) — desktop: 등 variant 접두 토큰은 canary 뷰포트와 불일치하면 미검출되므로 기본 토큰만 변형
  { name: 'tailwind-spacing', pattern: /(?<!:)\b(?:p|m|px|py|pt|pb|mx|my|mt|mb|gap|w|h|...)-(\d+)\b/ },
];
```

저 `(?<!:)`는 한 번 막히고 나서 추가됐다. canary가 `desktop:m-0`을 바꿨는데 검사는 mobile 화면에서 돌고 있었다. 당연히 화면 차이가 없었고, 도구는 검출에 실패했다고 작업을 멈췄다. 차이를 못 잡았는데도 통과시키지는 않은 것이다. 이후에는 해당 뷰포트에서 확인할 수 있도록 기본 토큰만 바꾸게 했다.

- 커버리지 차단. PR이 변경한 styled 컴포넌트가 crawl 중 실제 렌더되지 않으면 경고가 아니라 실패로 감지한다. 예외는 사유와 함께 JSON에 적어야 한다.

```json
// coverage-exemptions.json: 렌더링되지 않은 컴포넌트와 제외 사유
{
  "frontend/apps/web/domain/common/myPage/MyPageProfile/MyPointFromReferralToolTip.tsx":
    "fixture가 추천인 포인트를 null로 주어 조건부 미렌더 — highlight fixture 시나리오 추가 시 해제"
}
```

이런 제안은 대부분 에이전트가 먼저 했다. 나는 제안을 보고 트레이드오프를 따져봤고, 대체로 받아들였다. 페이지 전체를 crawl해서 검증할지, deprecated 색상 토큰을 옮길 때 이름과 실제 값 중 무엇을 보존할지 같은 결정은 함께 했다.

세부 구현을 지시하는 것보다 제안과 결과물을 검토하는 데 시간을 더 썼다.

* * *

## 상호작용까지 검증?

화면을 처음 띄웠을 때만 비교하면 클릭해서 여는 모달은 빠진다. 에이전트는 이런 UI를 확인할 라우트별 시나리오도 만들었다. 클릭만 하고 끝내는 게 아니라, 실제로 모달이 나타날 때까지 기다린 뒤 비교하는 식이었다.

```js
// scenarios/mypage-info.mjs — 시나리오 계약: run은 목표 UI가 나타날 때까지 대기해야 한다
export default [
  {
    name: 'open-delete-member-modal',
    run: async (page) => {
      await page.locator(':text-is("註銷會員"):visible').first().click({ timeout: 15_000 });
      // 클릭만 하고 끝내면 비결정 — 모달 헤더가 보일 때까지가 계약
      await page
        .locator(':text-is("會員註銷須知"):visible')
        .waitFor({ state: 'visible', timeout: 10_000 });
    },
  },
];
```

localStorage 기반이라 네트워크 모킹이 안 통하는 '최근 본 목록' 페이지는 스토리지를 시드하고 reload하는 시나리오로 풀었다.

```js
        window.localStorage.setItem('recently-view-items', JSON.stringify({
          // savedAt은 ISO 문자열이 아니라 도메인 고유의 평면 객체 — 틀리면 'Invalid Date'로 위장 실패
          'spot-13775': {
            type: 'spot', id: '13775',
            savedAt: { year: 2026, month: 5, day: 1, hour: 0, minute: 0, second: 0 },
          },
        }));
```

최근 본 목록을 준비하다가 처음에는 `savedAt`에 ISO 문자열을 넣어서 화면에 "Invalid Date"가 떴다. 에이전트가 도메인 코드를 따라가 보니 이 값은 `{year, month, day, ...}` 객체였다. fixture의 오퍼레이션 이름을 camelCase로 추측했다가 요청이 실서버로 빠진 적도 있다. 그때는 404 응답 때문에 아이템이 자동으로 삭제돼서 빈 목록처럼 보였다. 이런 문제와 처리 방법은 문서에 남기게 했다.

시나리오 검증은 나중에 실제 회귀도 잡았다. a11y 대응으로 클릭 핸들러를 옮기다가 언어 변경 모달이 안 열리게 됐는데, 모달이 나타나기를 기다리던 테스트가 타임아웃으로 막았다. 처음 화면만 비교했다면 놓쳤을 문제였다.

* * *

## 막혔을 때의 태도

기억에 남는 건 canary를 원복한 뒤에도 424건의 diff가 남았던 일이다. 다시 돌리면 재현이 안 되고, 단독 테스트도 통과했다.

에이전트는 바로 코드를 고치려 하지 않았다. 실패했을 때도 diff 리포트를 남기도록 계측부터 추가했다. 다음에 실패하면 무엇이 달랐는지 볼 수 있게 한 것이다.

결국 React 포털이 body에 붙는 순서가 실행마다 달라지는 게 원인이었다. 트리 경로로 요소를 짝지으니 툴팁과 숨겨진 모달이 엉뚱하게 비교되고, 그 아래에서 수백 건의 차이가 쏟아졌다. body 바로 아래의 자식들을 내용 시그니처로 정렬해서 비교 순서를 맞췄다.

```js
// 포털 마운트 순서는 런 간 비결정 — body 직속 자식은 내용 시그니처로 정렬해 페어링 안정화
const portalSignature = (element) => {
  // script/style 내용(__NEXT_DATA__ 등)은 워크트리마다 달라서 시그니처에서 제외
  const tags = [element.tagName.toLowerCase()];
  for (const descendant of element.querySelectorAll('*')) {
    if (descendant.tagName === 'SCRIPT' || descendant.tagName === 'STYLE') continue;
    tags.push(descendant.tagName.toLowerCase());
  }
  let text = '';
  const treeWalker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  while (treeWalker.nextNode() && text.length < 300) {
    const parentTag = treeWalker.currentNode.parentElement?.tagName;
    if (parentTag === 'SCRIPT' || parentTag === 'STYLE') continue;
    text += treeWalker.currentNode.textContent;
  }
  return `${tags.join('>')}|${text.replace(/\s+/g, ' ').trim().slice(0, 200)}`;
};
```

`__NEXT_DATA__`를 제외하는 디테일까지 챙기는 걸 나중에 발견하고, "아 뭔가 드디어 말이 통하는 놈이랑 일하는군!" 싶었다.

* * *

## 알아낸 건 문서에 남겼다

작업 내내 `MIGRATION_METHODOLOGY.md`라는 방법론 문서를 함께 유지보수하게 했다. 설계 문서로 시작해서 검증 진행시마다 새로운 것을 배우면 항목을 추가하게 해 두었다. 예를 들어 `styled(Button)` 같은 합성 케이스의 처리 규칙:

```tsx
// styled(Button) 대체 — DOM 동일.
// root 속성(padding)은 내부 styled 선언과 tie라 !로 우선순위 확보 (과도기 한정)
// descendant 규칙은 특이도(0,2,0)가 내부(0,1,0)보다 높아 ! 불필요
const IntegrationConnectButton = ({ className, ...props }: IntegrationConnectButtonProps) => (
  <Button
    borderRadius="1.5rem"
    className={cn('min-h-32 min-w-96 px-8! py-6!', className)}
    {...props}
  />
);
```

왜 어떤 곳엔 `!`가 붙고 어떤 곳엔 안 붙는지 등을 기록하는 셈이다. styled-components는 런타임에 `<style>`을 주입해서 정적 Tailwind CSS보다 늘 뒤에 오므로, 같은 특이도면 styled가 이긴다. 그래서 과도기 동안 root 속성 충돌은 `!`로 이기고, 후손 셀렉터는 특이도로 이긴다. 이런 의사결정 기록을 쌓아 이후 동작에서도 같은 이슈에서 다시 헤메지 않도록 처리했다.

문서에 적어두는 것 말고, 코드로 막을 수 있는 건 막았다. 스냅샷을 저장할 경로를 두지 않았고, lint 우회 주석은 pre-push 훅에서 걸리게 했고, 커버리지 예외에는 사유를 적게 했다.

이후에 다시 작업하는 에이전트가 문서의 규칙을 잘 지켜주리라고만 기대하지는 않은 셈이다.

* * *

## 결과와 느낀 점

파일럿은 25개 정도의 파일로 수행했다. 첫 PR은 도구와 방법론, 그리고 1개 경로의 파일럿. 두 번째 PR은 6개 경로로 적용 범위를 넓히면서 폼, 모달, localStorage 목록, grid 레이아웃까지 라우트 유형을 일부러 다양하게 골랐고, 전부 3개 뷰포트 × 기본/시나리오 상태에서 diff 0 + canary + 커버리지 100%를 통과했다.

이틀 동안 Fable5와 작업하면서 생각이 좀 바뀌었다. 처음에는 내가 검증 방법을 잘 정해줘야 한다고 생각했는데, 그 방법을 설계하는 일부터 에이전트가 꽤 잘했다. canary를 넣고, 막히면 계측을 추가하고, 알아낸 걸 문서에 남기는 과정에서도 세세하게 지시할 일이 별로 없었다.

내가 하는 일은 제안이 타당한지 판단하고 결과물을 리뷰하는 쪽에 가까웠다. 구현을 맡기는 것과는 좀 다른 경험이었다.

성공 조건을 기계가 판정할 수 있게 만드는 능력이 중요하다고 생각했는데, 이번에는 그것도 에이전트가 상당 부분 해줬다. 그러면 나는 어떤 문제를 골라서 맡길 수 있는가. 이쪽을 더 고민하게 됐다.