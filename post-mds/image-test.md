---
title: 이미지
date: 2022-01-01
tags: test
thumb: img/logo.png
---

![logo](../post-img/gatsby-logo.png)
 
```tsx
export default function PostTemplate({ data }: { data: Query }) {
  const post = data.markdownRemark;
  if (!post) return <div>404</div>;
  const { frontmatter } = post;

  const hitsCounter = `<a href="https://hits.seeyoufarm.com"><img src="https://hits.seeyoufarm.com/api/count/incr/badge.svg?url=https%3A%2F%2Fjonghakseo.github.io/post/${frontmatter?.title}%2Factions&count_bg=%2379C83D&title_bg=%23555555&icon=&icon_color=%23E7E7E7&title=hits&edge_flat=false"/></a>`;

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
