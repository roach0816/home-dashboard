"use client";

import { useState, useSyncExternalStore } from "react";
import { resolveIconSrc, isIconifyId } from "@/lib/icon";

// Icons loaded via <img src="https://api.iconify.design/..."> render in an
// isolated context — the SVG's `fill="currentColor"` can't inherit this
// page's CSS `color`, so it defaults to black regardless of theme. That's
// fine on light backgrounds but makes an icon nearly invisible on a dark
// card. Icons that already resolve to a full URL (e.g. ISP logos colored
// with their own brand color) are left untouched; this only affects plain
// "prefix:name" icon ids, which is what most widgets' registry icons are.
const DARK_MODE_ICON_COLOR = "9CA3AF";

function subscribeToColorScheme(callback: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function useIsDarkMode(): boolean {
  return useSyncExternalStore(
    subscribeToColorScheme,
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
    () => false,
  );
}

function coloredIconifyUrl(id: string, hex: string): string {
  const [prefix, ...rest] = id.trim().split(":");
  return `https://api.iconify.design/${prefix}/${rest.join(":")}.svg?color=%23${hex}`;
}

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
  const isDark = useIsDarkMode();

  const trimmed = icon?.trim();
  const src =
    trimmed && isDark && isIconifyId(trimmed) ? coloredIconifyUrl(trimmed, DARK_MODE_ICON_COLOR) : resolveIconSrc(icon);

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
