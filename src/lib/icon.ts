const ICONIFY_ID_RE = /^[a-z0-9-]+:[a-z0-9:-]+$/i;

export function isIconifyId(value: string): boolean {
  return ICONIFY_ID_RE.test(value.trim());
}

export function iconifyUrl(id: string): string {
  const [prefix, ...rest] = id.trim().split(":");
  return `https://api.iconify.design/${prefix}/${rest.join(":")}.svg`;
}

/** Resolves a bookmark's stored `icon` value (Iconify id, image URL, or data URI) to a src. */
export function resolveIconSrc(icon: string | undefined | null): string | null {
  if (!icon) return null;
  const trimmed = icon.trim();
  if (/^data:image\//i.test(trimmed)) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (isIconifyId(trimmed)) return iconifyUrl(trimmed);
  return null;
}

export function iconifySearchUrl(query: string, limit = 60): string {
  return `https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=${limit}`;
}
