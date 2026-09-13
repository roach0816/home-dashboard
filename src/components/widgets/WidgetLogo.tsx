"use client";

import { useState } from "react";
import { resolveIconSrc } from "@/lib/icon";

/**
 * A bare widget/service logo with no background box, padding, or ring —
 * unlike SiteIcon (used for bookmarks), which always renders one. Fails
 * silently (renders nothing) rather than falling back to a letter avatar,
 * since this is a small decorative accent, not the primary identifier.
 */
export default function WidgetLogo({
  icon,
  size = 22,
  className = "",
}: {
  icon: string | undefined;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = resolveIconSrc(icon);
  if (!src || failed) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={`shrink-0 object-contain ${className}`}
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}
