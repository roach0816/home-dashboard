import "server-only";

/** Turns opaque network/timeout errors into something a user can act on. */
export function describeError(err: unknown, fallback: string): string {
  if (err instanceof Error) {
    if (err.name === "TimeoutError" || /timeout/i.test(err.message)) {
      return "Timed out reaching the server — check the URL and that it's reachable.";
    }
    if (err.message === "fetch failed" || /ENOTFOUND|ECONNREFUSED|EHOSTUNREACH/.test(err.message)) {
      return "Could not reach the server — check the URL and network.";
    }
    return err.message;
  }
  return fallback;
}

export function basicAuthHeader(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

export async function assertOk(res: Response, label: string): Promise<void> {
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error(`${label} rejected the credentials — double-check them.`);
    }
    throw new Error(`${label} error (${res.status})`);
  }
}

/** Parses Prometheus text-format metrics into {metricName: [{labels, value}]}. */
export function parsePrometheusText(text: string): Map<string, Array<{ labels: Record<string, string>; value: number }>> {
  const result = new Map<string, Array<{ labels: Record<string, string>; value: number }>>();
  for (const line of text.split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)(\{(.*)\})?\s+([0-9.eE+-]+)/);
    if (!match) continue;
    const [, name, , labelStr, valueStr] = match;
    const labels: Record<string, string> = {};
    if (labelStr) {
      for (const pair of labelStr.match(/(\w+)="((?:[^"\\]|\\.)*)"/g) ?? []) {
        const m = pair.match(/(\w+)="((?:[^"\\]|\\.)*)"/);
        if (m) labels[m[1]] = m[2];
      }
    }
    const entries = result.get(name) ?? [];
    entries.push({ labels, value: Number(valueStr) });
    result.set(name, entries);
  }
  return result;
}
