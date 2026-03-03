---
title: "Web Vitals Improvement 2: SSG to SSR Migration"
description: "Sharing our experience of solving ISR cache miss issues in an ECS environment by switching to SSR + CDN caching for web vitals improvement."
publishDate: "2024-11-20"
tags: ["core web vitals"]
lang: "en"
translationQuality: "draft"
---

Continuing from [Part 1](/translations/web-vitals-improvement-1-en), I want to talk about the next task we undertook to improve web vitals.

### 2. Removing SSG, Switching to SSR

The second task was removing all existing SSG (ISR) in our Next.js environment and switching to SSR.

At first glance, this might seem counterintuitive — SSG generates HTML at build time while SSR renders on each user request, so shouldn't SSG be faster? That's a reasonable reaction.

To explain the background of this work, I need to provide some context about our deployment environment. Put simply, our frontend servers run as load-balanced containers on ECS. In this environment, SSG had a fatal flaw: since every user request goes through the ELB and is distributed across instances, the ISR behavior we expected wasn't working properly.

It makes sense when you think about it — the caching unit is the Next.js app, but with multiple apps running, the cache hit rate was abysmal.

While brainstorming various tricky solutions to this problem (like using Node clustering to run multiple apps on a single instance, or creating shared storage for SSG assets), a sudden realization hit me:

"Why not just cache at the CDN layer and serve SSR from the instances?!"

Exactly. If caching is the essence of the problem, we didn't need to perform heroic feats within Next.js to solve it.

We ripped out all SSG, added cache headers (s-maxage) for CloudFront caching, and deployed. The result was nothing short of transformative.

```ts
export const setCDNCacheHeader = (res: ServerResponse, maxAge: number) => {
  // Requests within 1 second use local cache, after that CDN cache kicks in.
  // This avoids issues from local caching and delegates content freshness to CDN.
  res.setHeader('Cache-Control', `public, max-age=1, s-maxage=${sMaxAge}`);
};

//...

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  //...
  setCDNCacheHeader(res, 60); // Cached in CloudFront for 1 minute.
  //...
}
```

This work taught me an important lesson: don't get trapped in the framework right in front of you when thinking about solutions to problems — step back and look at the bigger picture. A relatively simple task of moving the caching layer to CDN provided tremendous benefits to users, yet I had been too fixated on optimizing SSG itself. It was a moment of deep reflection.
