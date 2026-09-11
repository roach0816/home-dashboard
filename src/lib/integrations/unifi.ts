import "server-only";
import type { UnifiConfig } from "@/lib/types";
import { integrationFetch } from "@/lib/insecureFetch";
import { assertOk } from "./util";

export type UnifiData = {
  clientCount: number;
  wanStatus: string;
  wanIp?: string;
};

async function login(base: string, username: string, password: string, insecure?: boolean) {
  // UniFi OS consoles (UDM/UDM-Pro/Cloud Gateway) use /api/auth/login and proxy
  // the classic controller API under /proxy/network. Older self-hosted
  // Controller software uses /api/login directly. Try UniFi OS first.
  let res = await integrationFetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    insecure,
  });
  let prefix = "/proxy/network";
  if (res.status === 404) {
    res = await integrationFetch(`${base}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      insecure,
    });
    prefix = "";
  }
  await assertOk(res, "UniFi");

  const getSetCookie = (res.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  const raw = typeof getSetCookie === "function" ? getSetCookie.call(res.headers) : [];
  const cookie = raw.length > 0 ? raw.map((c) => c.split(";")[0]).join("; ") : res.headers.get("set-cookie");
  if (!cookie) throw new Error("UniFi login did not return a session cookie.");
  return { cookie, prefix };
}

export async function fetchUnifiData(
  config: UnifiConfig,
  secrets: Record<string, string>,
): Promise<UnifiData> {
  const { username, password } = secrets;
  if (!username || !password) throw new Error("UniFi credentials not configured.");

  const base = config.baseUrl.replace(/\/$/, "");
  const site = config.site || "default";
  const { cookie, prefix } = await login(base, username, password, config.insecureTls);
  const headers = { Cookie: cookie };

  const clientsRes = await integrationFetch(`${base}${prefix}/api/s/${site}/stat/sta`, {
    headers,
    insecure: config.insecureTls,
    cache: "no-store",
  });
  await assertOk(clientsRes, "UniFi");
  const clientsBody = (await clientsRes.json()) as { data: unknown[] };

  const healthRes = await integrationFetch(`${base}${prefix}/api/s/${site}/stat/health`, {
    headers,
    insecure: config.insecureTls,
    cache: "no-store",
  });
  await assertOk(healthRes, "UniFi");
  const healthBody = (await healthRes.json()) as {
    data: Array<{ subsystem: string; status: string; wan_ip?: string }>;
  };
  const wan = healthBody.data?.find((s) => s.subsystem === "wan");

  return {
    clientCount: clientsBody.data?.length ?? 0,
    wanStatus: wan?.status ?? "unknown",
    wanIp: wan?.wan_ip,
  };
}
