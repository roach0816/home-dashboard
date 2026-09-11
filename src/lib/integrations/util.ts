import "server-only";

/**
 * Turns opaque network/timeout errors into something a user can act on.
 * Node's fetch wraps the real reason in `TypeError: fetch failed` with the
 * actual cause (DNS failure, connection refused, bad TLS cert, ...) tucked
 * away in `.cause` — surface that instead of a generic bucket message.
 */
export function describeError(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback;

  if (err.name === "TimeoutError" || /timeout/i.test(err.message)) {
    return "Timed out reaching the server — check the URL and that it's reachable.";
  }

  const cause = (err as { cause?: unknown }).cause;
  const causeErr = cause instanceof Error ? cause : undefined;
  const code = (causeErr as { code?: string } | undefined)?.code;
  const causeMessage = causeErr?.message ?? "";

  if (code === "ENOTFOUND" || code === "EAI_AGAIN" || /getaddrinfo/i.test(causeMessage)) {
    return `Couldn't resolve that hostname (DNS lookup failed: ${code ?? causeMessage}). If it ends in ".local", that's often the cause — mDNS names usually don't resolve from inside a cluster pod. Try the IP address instead.`;
  }
  if (code === "ECONNREFUSED") {
    return "Connection refused — check the port, and that the service is actually running there.";
  }
  if (code === "EHOSTUNREACH" || code === "ENETUNREACH") {
    return "Host unreachable — check network routing/firewall rules between the cluster and that host.";
  }
  if (/certificate|SSL|TLS/i.test(causeMessage) || (code ?? "").includes("CERT")) {
    return `TLS certificate error (${causeMessage || code}) — if this service uses a self-signed certificate, enable "Allow self-signed certificate" in the widget's settings.`;
  }
  if (causeMessage) {
    return `Could not reach the server: ${causeMessage}`;
  }
  if (err.message === "fetch failed") {
    return "Could not reach the server — check the URL and network.";
  }
  return err.message;
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
