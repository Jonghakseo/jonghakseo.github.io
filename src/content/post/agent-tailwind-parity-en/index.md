---
title: "The Time Has Come to Learn by Watching LLMs"
description: "Notes from building a styled-components to Tailwind migration verification system with Fable5."
publishDate: "2026-06-12"
tags: ["ai", "tailwind", "migration", "Fable5"]
lang: "en"
translationQuality: "draft"
---

I built a verification system for migrating from styled-components to Tailwind with Fable5. At first, I thought I would use it to get ideas and delegate the implementation details. But as the work progressed, I found myself learning from the way the agent defined the problem and designed the verification method. This is a record of that process.

* * *

## 1,300 files and one failed attempt

At Creatrip, we have a user-page codebase that is about five years old. We had been gradually removing styled-components, the styling library we had used from the early days, and migrating to Tailwind CSS over the past year. New components are all written with Tailwind, and when existing component styles are changed, we generally recommend migrating them to Tailwind CSS as well.

Even after that ongoing migration, around 1,300 styled-components files remained. Moving them to Tailwind had been a long-standing task. The hard part was not the scale itself, but confirming that the screen still looked the same after the move.

A migration itself looks like this. Before:

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

After:

```tsx
<div className="vstack mx-0 mt-32 mb-24 items-center desktop:m-0">
```

A five-line example looks easy. But there are thousands of declarations like this, and mixed among them are child selectors that override another component's internal styles, media queries that are ranges rather than simple min-width rules (680–919px), and `styled(Component)` wrappers around other styled components. If even one subtle detail shifts, the screen can break. Checking all of that by eye is difficult.

Because of this, I had previously used AI to build component tests based on computed-style snapshots and used them for partial migrations. But the more I used that tool, the harder it was to trust it fully. The moment a component is isolated, the real difficulties of CSS — cascade, inheritance, and parent descendant selectors overriding children — either disappear or get distorted.

Fable5 was released right around the time I was feeling that limitation. Could this time be different? I started with: "Let's think together about what kind of method we would need to safely migrate the styled-components in the user pages." Since it was the latest and supposedly smartest model, my intention was to start from problem definition rather than implementation.

* * *

## The verification system the agent built

After only a few rounds of discussion, the agent designed a page-level twin diff tool called `tw-parity`. The tool launches the same page in two versions — before and after the migration — and compares the entire rendered result. Usage looks like this:

```bash
# Compare an entire route by launching base(development) and head(PR branch) worktrees at the same time
pnpm -F web tw-parity run --route /mypage/point \
  --base-dir ~/.worktrees/product/tw-parity-base \
  --head-dir ~/.worktrees/product/feature-branch \
  --viewports mobile,tablet,desktop

# exit 0: no diff / 1: diff or coverage failure / 2: infrastructure failure or canary not detected(result unreliable)
```

The concept and usage look simple, but the details underneath were surprisingly careful. They are also why I ended up writing this post.

- Instant two-worktree comparison. It renders both versions on the same machine, in the same browser, with the same fonts, and compares the DOM tree, computed styles for every element, and even `::before` / `::after`. It does not save snapshot files. Keeping a stored baseline can create false passes where OLD is compared against OLD.
- Noise suppression. GraphQL responses are intercepted with tool-owned fixtures and injected identically into both sides. Time and randomness are fixed as well.

```js
// installDeterminism — make sure "differences that are not the target of comparison" cannot happen in the first place
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

- Meta verification(canary). On every run, it temporarily applies a 1px mutation to the head source, verifies that the mutation is actually detected, and then reverts it. This distinguishes "diff 0 because the pages are identical" from "diff 0 because the comparison pipeline is broken and cannot see anything." I never gave an instruction to build this.

```js
// Mutation strategy: for styled files, increment a getRem number; for migrated files, increment a Tailwind spacing token by 1
const MUTATION_STRATEGIES = [
  { name: 'getRem', pattern: /getRem\(\s*(\d+(?:\.\d+)?)/ },
  // (?<!:) — variant-prefixed tokens like desktop: may not be visible in the canary viewport, so mutate only base tokens
  { name: 'tailwind-spacing', pattern: /(?<!:)\b(?:p|m|px|py|pt|pb|mx|my|mt|mb|gap|w|h|...)-(\d+)\b/ },
];
```

There is a story behind that `(?<!:)` lookbehind. It was not there at first. On one route, the canary mutated `desktop:m-0` and then verified it in the mobile viewport. Since there was naturally no visual difference, it marked the canary as undetected and stopped the run. It did not false-pass; it failed safe. That one line was added after that incident.

- Coverage blocking. If a styled component changed by the PR is not actually rendered during the crawl, it is treated as a failure rather than a warning. Exceptions must be written in JSON with a reason.

```json
// coverage-exemptions.json — "covered or explicitly exempted" is the honest form of the contract
{
  "frontend/apps/web/domain/common/myPage/MyPageProfile/MyPointFromReferralToolTip.tsx":
    "fixture gives referral points as null, so it is conditionally not rendered — remove this after adding a highlight fixture scenario"
}
```

Honestly, I did not do much in these decisions. The agent(Fable) made the proposals, and after checking the trade-offs, I accepted most of them. Most of them made sense. My decisions were mostly small ones, like whether the main verification axis should be page crawling, or whether deprecated color tokens should be mapped by preserving values rather than names.

* * *

## Verifying interactions too?

Static screen comparison was within my expectations. What came next was behavior and interaction verification.

UI that only appears after a click, such as a modal, is obviously not caught by a basic crawl. So the agent created route-specific scenario files. Honestly, I had not expected it to go this far.

```js
// scenarios/mypage-info.mjs — scenario contract: run must wait until the target UI appears
export default [
  {
    name: 'open-delete-member-modal',
    run: async (page) => {
      await page.locator(':text-is("註銷會員"):visible').first().click({ timeout: 15_000 });
      // If we only click and stop, the state is nondeterministic — the contract is to wait until the modal header appears
      await page
        .locator(':text-is("會員註銷須知"):visible')
        .waitFor({ state: 'visible', timeout: 10_000 });
    },
  },
];
```

For the "recently viewed" page, which is based on localStorage and therefore cannot be handled by network mocking, the agent solved it with a scenario that seeds storage and reloads the page.

```js
// scenarios/mypage-recently-viewed.mjs
export default [
  {
    name: 'seeded-recently-viewed',
    run: async (page) => {
      await page.evaluate(() => {
        window.localStorage.setItem('recently-view-items', JSON.stringify({
          // savedAt is not an ISO string but a domain-specific flat object — if this is wrong, it fails disguised as 'Invalid Date'
          'spot-13775': {
            type: 'spot', id: '13775',
            savedAt: { year: 2026, month: 5, day: 1, hour: 0, minute: 0, second: 0 },
          },
        }));
      });
      await page.reload({ waitUntil: 'domcontentloaded' });
      // Since savedAt is fixed, the date group label is deterministically '2026.05.01'
      await page.locator(':text-is("2026.05.01"):visible').waitFor({ state: 'visible', timeout: 15_000 });
    },
  },
];
```

That `savedAt` comment came from a real issue. At first, the agent seeded it as an ISO string, and the screen showed "Invalid Date." It then traced through the domain code and found that the stored format was a flat object like `{year, month, day, ...}`. There was another incident where it guessed the fixture operation name in camelCase, the request silently fell back to the real server, a 404 response triggered automatic item deletion, and the result was disguised as an "empty list." I instructed it to leave these details in the methodology runbook, and it kept recording them as requested.

This scenario contract paid off later. During migration, an a11y change moved a click handler and quietly broke the trigger for the language-change modal. The screen did not change visually at all, but the scenario that waited until the modal opened timed out and blocked it. It was a behavior regression that visual comparison alone would have struggled to catch.

* * *

## Its attitude when blocked

One moment stood out while I was observing the work. A canary revert verification left 424 diffs behind. It was not reproducible, and the isolated test passed.

The agent's order of operations was different. Before trying to fix it, it first added instrumentation so that diff reports would be recorded even on failure. It made sure data would remain on the next failure, and then used that data to find the cause. React portals can mount into `body` in different orders between runs, so if tree-path-based matching pairs "tooltip" with "hidden modal" incorrectly, hundreds of false positives can appear in one subtree.

The solution it found was to sort direct `body` children by a content signature and stabilize pairing.

```js
// Portal mount order is nondeterministic between runs — stabilize pairing by sorting direct body children with content signatures
const portalSignature = (element) => {
  // Exclude script/style content(__NEXT_DATA__, etc.) because it differs by worktree
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

When I later noticed that it had even excluded `__NEXT_DATA__`, I thought, "Ah, I am finally working with something that gets it."

* * *

## The documentation stayed alive

Throughout the work, I had the agent maintain a methodology document called `MIGRATION_METHODOLOGY.md`. It started as a design document, and I made it add new entries whenever it learned something during verification. For example, here is the rule for a composition case like `styled(Button)`:

```tsx
// Replacement for styled(Button) — same DOM.
// root properties(padding) tie with the internal styled declaration, so use ! to secure priority during the transition
// descendant rules have higher specificity(0,2,0) than internal rules(0,1,0), so ! is unnecessary
const IntegrationConnectButton = ({ className, ...props }: IntegrationConnectButtonProps) => (
  <Button
    borderRadius="1.5rem"
    className={cn('min-h-32 min-w-96 px-8! py-6!', className)}
    {...props}
  />
);
```

It records why some places need `!` and others do not. styled-components injects `<style>` at runtime, so it always comes after static Tailwind CSS. If specificity is the same, styled-components wins. During the transition, root property conflicts are therefore won with `!`, while descendant selectors are won with specificity. By accumulating these decision records, the agent avoided falling into the same issues again in later work.

As the agent followed the rules better and better, the self-maintenance effect of this runbook seemed to grow. No snapshot storage(the storage path does not exist), no lint-bypass comments(pre-push hooks block them), and coverage exceptions require reasons. The system was designed on the assumption that even the agent itself, and every "future worker," should not be trusted blindly.

* * *

## Results and thoughts

The pilot covered around 25 files. The first PR contained the tool, the methodology, and a one-route pilot. The second PR expanded the scope to six routes and deliberately included different route types — forms, modals, a localStorage list, and grid layouts. All of them passed with diff 0 + canary + 100% coverage across three viewports and both default/scenario states.

After using Fable5 for two days, I felt that with intelligence at this level, it is hard to see agents as mere tools that execute instructions.

When given a problem, it designs a verification system. When blocked, it adds instrumentation before identifying the cause. It records lessons in documentation so the next iteration is cheaper. What felt encouraging was that most of this cycle worked without detailed instructions from the user. My role leaned more toward decision-making and reviewing the results.

It also made me think again about the next set of skills engineers will need. I used to think the important ability was to choose service problems worth solving this way and turn the success condition into something a machine can judge. But now it feels like agents are getting pretty good at the latter part too. In the end, what may matter more is the ability to choose which problems to hand over.
