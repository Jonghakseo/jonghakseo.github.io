---
title: 이미지
date: 2022-01-01
tags: test, 태그2
---

![logo](../post-img/gatsby-logo.png)
 
```tsx
export default function PostTemplate({ data }: { data: Query }) {
  const post = data.markdownRemark;
  if (!post) return <div>404</div>;
  const { frontmatter } = post;

  const hitsCounter = `dd`;

  return (
    <div>
      <div>
        <h1>{frontmatter?.title}</h1>
        <div dangerouslySetInnerHTML={{ __html: hitsCounter }} />
        <div dangerouslySetInnerHTML={{ __html: `${post?.html}` }} />
      </div>
    </div>
  );
}

```
