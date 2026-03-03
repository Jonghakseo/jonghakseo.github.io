---
title: "Web Vitals Improvement Part 3 - Applying SWR"
description: "Sharing our experience of dramatically improving web vitals by applying the stale-while-revalidate caching strategy to our CDN."
publishDate: "2024-11-20"
tags: ["core web vitals"]
lang: "en"
translationQuality: "draft"
---

Continuing from the previous two parts, I want to talk about the third task we undertook to improve web vitals.

- [Part 1 - Dynamic i18n Loading](/translations/web-vitals-improvement-1-en)
- [Part 2 - Removing SSG, Switching to SSR](/translations/web-vitals-improvement-2-en)

### 3. Applying SWR

First, SWR stands for stale-while-revalidate. In the frontend ecosystem, there's a well-known library of the same name created by Vercel. And yes, it's the same SWR concept.

- [RFC 5861: HTTP Cache-Control Extensions for Stale Content](https://datatracker.ietf.org/doc/html/rfc5861)
- [SWR - React Hooks for Data Fetching](https://swr.vercel.app/)

HTTP [RFC2616] requires caches to "respond with the most recent fresh response available for the request," but it also states that in "carefully considered circumstances," returning a stale response is permitted. This document defines two independent Cache-Control extensions that enable such control: stale-if-error and stale-while-revalidate.

The stale-if-error HTTP Cache-Control extension allows a cache to return a stale response when an error occurs — such as a 500 Internal Server Error, network segment failure, or DNS failure — instead of returning a "severe" error. This improves availability.

**The stale-while-revalidate HTTP Cache-Control extension allows a cache to immediately return a stale response while it revalidates the response in the background, hiding network and server latency from the client.**

There's no need to overthink this — SWR is simply a caching strategy. While data is being refreshed, incoming requests are served with stale data first. In other words, "while the data is being revalidated, if there's old data available, serve that first."

- [MDN - Cache-Control: stale-while-revalidate](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate)

![Rough sketch](../web-vitals-improvement-3/img1.png)

Just as we added s-maxage to the Cache-Control header in SSR responses for CDN caching in the previous part, to use SWR, we simply need to add stale-while-revalidate to the Cache-Control header with a time value.

```ts
export const setCDNCacheHeader = (
  res: ServerResponse,
  sMaxAge: number,
  staleWhileRevalidate?: number,
) => {
  // Requests within 1 second use cache, after that CDN cache kicks in.
  // This avoids issues from disk caching and delegates content freshness to CDN.
  const cacheValue = [];
  cacheValue.push('public');
  cacheValue.push(`max-age=1`);
  cacheValue.push(`s-maxage=${sMaxAge}`);
  if (staleWhileRevalidate) {
    cacheValue.push(`stale-while-revalidate=${staleWhileRevalidate}`);
  }
  res.setHeader('Cache-Control', cacheValue.join(', '));
};

//...

// Inside getServerSideProps
setCDNCacheHeader(
  res,
  REVALIDATE_INTERVAL_SECONDS.THIRTY_MINUTES, // 30 minutes
  STALE_WHILE_REVALIDATE_SECONDS.ONE_WEEK, // 1 week
);
```

The above code works as follows:

1. Pages within 30 minutes are considered fresh and served from CDN cache.
2. If no page within 30 minutes exists, a page up to 1 week old is returned while internally refreshing with a new page.
3. If no page within 1 week exists, the client waits for a new page to be generated. (The generated page is then cached.)

![Before and after SWR comparison](../web-vitals-improvement-3/img2.png)

Applying SWR headers was the single task that had the greatest impact on user experience. Absolute best bang for the buck! It was merged to production in September, and the overall perceived speed of the product improved dramatically after this point. There was also a lot of user feedback noting improved response times, making this a personally very satisfying piece of work.

![Final results](../web-vitals-improvement-3/img3.png)
