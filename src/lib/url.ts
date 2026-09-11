export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) {
    return trimmed;
  }
  return `http://${trimmed}`;
}

export function faviconUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(normalizeUrl(rawUrl));
    return `https://www.google.com/s2/favicons?sz=64&domain=${parsed.hostname}`;
  } catch {
    return null;
  }
}

export function hostnameOf(rawUrl: string): string {
  try {
    return new URL(normalizeUrl(rawUrl)).hostname;
  } catch {
    return rawUrl;
  }
}
