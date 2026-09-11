"use client";

import { useState } from "react";
import { faviconUrl } from "@/lib/url";
import { resolveIconSrc } from "@/lib/icon";

const PALETTE = [
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
];

function colorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

export default function SiteIcon({
  title,
  url,
  icon,
  size = 28,
}: {
  title: string;
  url: string;
  icon?: string;
  size?: number;
}) {
  const explicitSrc = resolveIconSrc(icon);
  const src = explicitSrc ?? faviconUrl(url);
  const [failed, setFailed] = useState(false);

  // reset the error state when the icon/url actually changes (e.g. after picking a new icon)
  const [lastSrc, setLastSrc] = useState(src);
  if (src !== lastSrc) {
    setLastSrc(src);
    setFailed(false);
  }

  const initial = title.trim().charAt(0).toUpperCase() || "?";

  if (!src || failed) {
    return (
      <span
        className="flex shrink-0 items-center justify-center rounded-md font-semibold text-white"
        style={{ width: size, height: size, background: colorFor(title || url), fontSize: size * 0.5 }}
      >
        {initial}
      </span>
    );
  }

  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-md bg-white p-1 ring-1 ring-black/5"
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="h-full w-full object-contain"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
