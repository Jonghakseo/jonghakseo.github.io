---
title: "LLM 보면서 배워야 하는 시기가 왔다"
description: "styled-components - Tailwind 마이그레이션을 Fable5과 함께 하며 관찰한 기록."
publishDate: "2026-06-12"
tags: ["ai", "tailwind", "migration", "Fable5"]
lang: "ko"
---

styled-components → Tailwind 마이그레이션 검증 체계를 Fable5와 함께 만들었다. 처음에는 아이디어를 얻고 세부 구현을 맡기는 정도로 생각했는데, 진행할수록 에이전트가 문제를 정의하고 검증 방법을 세우는 모습을 보면서 배울 점이 많다는 생각이 들어 기록으로 남긴다.

* * *

## 1,300개의 파일, 한 번의 실패 경험

크리에이트립에는 올해로 5년 정도가 된 유저페이지 코드베이스가 있다. 스타일링 라이브러리로 초기부터 사용했던 styled-components를 걷어내고, 1년 전부터 tailwindcss로 점진적 마이그레이션을 하고 있었다. 신규 컴포넌트는 모두 tailwind로 작성하고, 기존 컴포넌트 스타일 수정시에도 가급적 tailwindcss로 마이그레이션을 권장한다.
그렇게 마이그레이션을 진행했음에도 아직 styled-components 파일이 1,300개 정도가 남아있다. Tailwind로 옮기는 건 오래된 숙제였다. 어려운 건 규모보다, 옮긴 뒤 화면이 그대로인지 확인하는 일이었다.

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

- 메타 검증(canary). 매 실행마다 head 소스에 1px 변형을 임시로 가하고, 그 변형이 실제로 검출되는지 확인한 뒤 원복한다. "diff 0"이 나왔을 때 정말 동일한 건지, 비교 파이프라인이 고장나서 아무것도 못 보고 있는 건지를 구분하기 위해서다. (이런 지시를 내린적은 없다)

```js
// 변형 전략: styled 파일은 getRem 숫자를, 변환 완료 파일은 Tailwind spacing 토큰을 +1
const MUTATION_STRATEGIES = [
  { name: 'getRem', pattern: /getRem\(\s*(\d+(?:\.\d+)?)/ },
  // (?<!:) — desktop: 등 variant 접두 토큰은 canary 뷰포트와 불일치하면 미검출되므로 기본 토큰만 변형
  { name: 'tailwind-spacing', pattern: /(?<!:)\b(?:p|m|px|py|pt|pb|mx|my|mt|mb|gap|w|h|...)-(\d+)\b/ },
];
```

저 `(?<!:)` 룩비하인드에도 사연이 있다. 처음엔 없었는데, 어느 라우트에서 canary가 `desktop:m-0`을 변형해놓고 mobile 뷰포트로 검증하다가(당연히 시각 차이가 없으니) 미검출로 판단하고 실행을 중단했다. false-pass가 아니라 fail-safe로 멈춘 셈이고, 저 한 줄은 그때 생겼다.

- 커버리지 차단. PR이 변경한 styled 컴포넌트가 crawl 중 실제 렌더되지 않으면 경고가 아니라 실패로 감지한다. 예외는 사유와 함께 JSON에 적어야 한다.

```json
// coverage-exemptions.json — "커버 또는 명시적 예외"가 계약의 정직한 형태
{
  "frontend/apps/web/domain/common/myPage/MyPageProfile/MyPointFromReferralToolTip.tsx":
    "fixture가 추천인 포인트를 null로 주어 조건부 미렌더 — highlight fixture 시나리오 추가 시 해제"
}
```

솔직히 이러한 의사결정에서 내가 한 일은 크게 없었다. 제안은 에이전트(fable)가 제안했고, 나는 트레이드 오프만 검증 후 대부분의 제안을 수용했다. 그도 그럴것이, 대부분 Make sense 했기 때문이다. 나는 검증 중심축을 페이지 crawl로 갈지, deprecated 색상 토큰을 이름이 아니라 값 보존 기준으로 매핑할지와 같은 자잘한 결정을 주로 했다.

* * *

## 상호작용까지 검증?

정적 화면 비교까지는 예상 범위였다. 그 다음에 들어간 건 동작과 상호작용 검증이었다.

모달처럼 "클릭해야 나타나는 UI"는 기본 crawl로는(당연히) 안 잡힌다. 그래서 에이전트는 라우트별 시나리오 파일을 만들었다. 솔직히 이것까진 기대도 안 했는데...

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
// scenarios/mypage-recently-viewed.mjs
export default [
  {
    name: 'seeded-recently-viewed',
    run: async (page) => {
      await page.evaluate(() => {
        window.localStorage.setItem('recently-view-items', JSON.stringify({
          // savedAt은 ISO 문자열이 아니라 도메인 고유의 평면 객체 — 틀리면 'Invalid Date'로 위장 실패
          'spot-13775': {
            type: 'spot', id: '13775',
            savedAt: { year: 2026, month: 5, day: 1, hour: 0, minute: 0, second: 0 },
          },
        }));
      });
      await page.reload({ waitUntil: 'domcontentloaded' });
      // savedAt을 고정했으므로 날짜 그룹 라벨이 결정적으로 '2026.05.01'
      await page.locator(':text-is("2026.05.01"):visible').waitFor({ state: 'visible', timeout: 15_000 });
    },
  },
];
```

저 `savedAt` 주석도 실제 문제에서 나온 것이다. 처음에 ISO 문자열로 시드했더니 화면에 "Invalid Date"가 떴고, 에이전트는 도메인 코드를 역추적해서 저장 형식이 `{year, month, day, ...}` 평면 객체라는 걸 알아냈다. fixture의 오퍼레이션 이름을 camelCase로 추측했다가 요청이 조용히 실서버로 폴백되고, 404 응답이 아이템 자동삭제를 트리거해서 "빈 목록"으로 위장된 사건도 있었다. 이런 내용은 전부 방법론 문서의 runbook에 남기도록 지시했는데, 요청대로 잘 기록하며 진행했다.

이 시나리오 계약은 나중에 효과를 냈다. 마이그레이션 도중 a11y 대응으로 클릭 핸들러를 옮기다가 언어 변경 모달의 트리거가 조용히 죽은 적이 있는데 '모달이 열릴 때까지 대기'하는 시나리오가 타임아웃으로 차단했다. 시각 비교만으로는 잡기 어려운 동작 회귀였다.

* * *

## 막혔을 때의 태도

작업을 관찰하던 중 유독 기억에 남는 일이 있었다. canary 원복 검증에서 424건의 diff가 남았다. 재현은 안 되고, 단독 테스트는 통과하고.

에이전트의 행동 순서가 달랐다. 고치려 들기 전에, 실패 시에도 diff 리포트가 기록되도록 계측 코드부터 추가했다. 다음 실패 때 데이터가 남게 만들고 그 데이터로 원인을 찾았다. React 포털이 body에 마운트되는 순서가 실행마다 달라질 수 있어서, 트리 경로 기반 매칭이 "툴팁 vs 숨겨진 모달"을 잘못 짝지으면 한 서브트리에서 수백 건이 오탐된다는 것을 결국 알아냈다.

찾은 해법은 body 직속 자식들을 내용 시그니처로 정렬해서 페어링을 안정화하는 것이었다.

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

## 문서가 살아있다

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

에이전트가 규칙을 점점 더 잘 지키게 되면서, 이런 runbook의 자체 유지보수 효과도 극대화 되는 것 같다. 스냅샷 저장 금지(저장 경로 자체가 없다), lint 우회 주석 금지(pre-push 훅이 막는다), 커버리지 예외는 사유 필수. 에이전트가 자기 자신을 포함한 "미래의 작업자"를 불신하는 것을 전제로 했다.

* * *

## 결과와 느낀 점

파일럿은 25개 정도의 파일로 수행했다. 첫 PR은 도구와 방법론, 그리고 1개 경로의 파일럿. 두 번째 PR은 6개 경로로 적용 범위를 넓히면서 폼, 모달, localStorage 목록, grid 레이아웃까지 라우트 유형을 일부러 다양하게 골랐고, 전부 3개 뷰포트 × 기본/시나리오 상태에서 diff 0 + canary + 커버리지 100%를 통과했다.

이틀간 fable5를 사용해보며 느낀 건, 이정도 수준의 지능에서는 더 이상 에이전트를 단순히 지시를 수행하는 도구로만 보기는 어렵다는 점이다.

문제를 정의하면 검증 체계를 설계하고, 막히면 계측부터 추가해서 원인을 규명하고, 교훈을 문서로 축적해서 다음 반복을 대비하는데 이 사이클 대부분에서 사용자의 디테일한 지시 없이도 동작했다는 점이 고무적이다. 내가 한 건 의사결정과 결과물 리뷰에 치중되어 있었다.

새삼 엔지니어들의 다음 역량에 대해서도 고민하게 되었다. 이전에는 서비스 문제 중에서 이런 방식으로 풀 가치가 있는 과제를 고르고, 성공 조건을 기계가 판정할 수 있는 형태로 바꾸는 능력이 중요하다고 생각했다. 그런데 이제는 성공 조건을 기계가 판정할 수 있는 형태로 바꾸는 일도 에이전트가 꽤 잘한다는 느낌을 받았다. 결국 더 중요해지는 건, 어떤 문제를 맡길지 고르는 능력일지도 모르겠다.