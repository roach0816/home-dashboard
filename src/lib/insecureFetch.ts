import "server-only";
import { Agent, fetch as undiciFetch } from "undici";

const insecureAgent = new Agent({ connect: { rejectUnauthorized: false } });
const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * The fetch() every integration client should use. Applies a default
 * timeout (a homelab host that's off or unreachable would otherwise hang
 * the request indefinitely — Node's fetch has no timeout by default) and
 * can optionally skip TLS certificate verification, needed for services
 * (Proxmox, UniFi, TrueNAS, Portainer, ...) that commonly sit behind a
 * self-signed certificate on the local network.
 */
export function integrationFetch(
  url: string,
  init: RequestInit & { insecure?: boolean; timeoutMs?: number } = {},
): Promise<Response> {
  const { insecure, timeoutMs, signal, ...rest } = init;
  const finalSignal = signal ?? AbortSignal.timeout(timeoutMs ?? DEFAULT_TIMEOUT_MS);

  if (insecure) {
    return undiciFetch(url, {
      ...rest,
      signal: finalSignal,
      dispatcher: insecureAgent,
    } as Parameters<typeof undiciFetch>[1]) as unknown as Promise<Response>;
  }
  return fetch(url, { ...rest, signal: finalSignal });
}
