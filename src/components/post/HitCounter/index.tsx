import React from "react";

interface HitCounterProps {
  href: string;
}

export default function HitCounter({ href }: HitCounterProps) {
  const titleBgColor = 555555;
  const countBgColor = 222222;
  const hitsCounter = `<img src="https://hits.seeyoufarm.com/api/count/incr/badge.svg?url=${href}%2Factions&count_bg=%23${countBgColor}&title_bg=%23${titleBgColor}&title=😀&edge_flat=false"/>`;

  return <div dangerouslySetInnerHTML={{ __html: hitsCounter }} />;
}
