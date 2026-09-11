import "server-only";
import type { UnifiConfig } from "@/lib/types";
import { integrationFetch } from "@/lib/insecureFetch";
import { assertOk } from "./util";

export type UnifiWan = {
  name: string;
  ispName?: string;
  uptimePercent?: number;
};

export type UnifiData = {
  totalClients: number;
  wiredClients: number;
  wirelessClients: number;
  deviceCount: number;
  devicesOnline: number;
  wanStatus: string;
  wanIp?: string;
  /** Per-WAN provider info, when the controller supports the newer v2 WAN API. Empty if not. */
  wans: UnifiWan[];
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

/** Best-effort — this v2 API is only on newer UniFi OS controllers. Returns [] if unsupported. */
async function fetchWanProviders(
  base: string,
  prefix: string,
  site: string,
  headers: Record<string, string>,
  insecure: boolean | undefined,
): Promise<UnifiWan[]> {
  try {
    const res = await integrationFetch(`${base}${prefix}/v2/api/site/${site}/wan/enriched-configuration`, {
      headers,
      insecure,
      cache: "no-store",
    });
    if (!res.ok) return [];
    const body = (await res.json()) as unknown;
    const list: unknown[] = Array.isArray(body)
      ? body
      : Array.isArray((body as { data?: unknown[] })?.data)
        ? (body as { data: unknown[] }).data
        : [body];

    const wans: UnifiWan[] = [];
    for (const entry of list) {
      const e = entry as {
        configuration?: { name?: string; wan_networkgroup?: string };
        details?: { service_provider?: { name?: string } };
        statistics?: { uptime_percentage?: number };
      };
      const name = e?.configuration?.name || e?.configuration?.wan_networkgroup;
      if (!name) continue;

      const ispName = e?.details?.service_provider?.name;
      const uptimePercent = e?.statistics?.uptime_percentage;
      // Controllers report every WAN-capable port the hardware has, even
      // ones that were never actually set up. An unconfigured port has no
      // known ISP and no real uptime data (UniFi uses -1 as a "no data"
      // sentinel here), unlike a real WAN that's simply down right now.
      if (!ispName && (uptimePercent == null || uptimePercent < 0)) continue;

      wans.push({ name, ispName, uptimePercent });
    }
    return wans;
  } catch {
    return [];
  }
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
  const clientsBody = (await clientsRes.json()) as { data: Array<{ is_wired?: boolean }> };
  const clients = clientsBody.data ?? [];
  const wiredClients = clients.filter((c) => c.is_wired).length;

  const devicesRes = await integrationFetch(`${base}${prefix}/api/s/${site}/stat/device`, {
    headers,
    insecure: config.insecureTls,
    cache: "no-store",
  });
  await assertOk(devicesRes, "UniFi");
  const devicesBody = (await devicesRes.json()) as { data: Array<{ state?: number }> };
  const devices = devicesBody.data ?? [];

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

  const wans = await fetchWanProviders(base, prefix, site, headers, config.insecureTls);

  return {
    totalClients: clients.length,
    wiredClients,
    wirelessClients: clients.length - wiredClients,
    deviceCount: devices.length,
    devicesOnline: devices.filter((d) => d.state === 1).length,
    wanStatus: wan?.status ?? "unknown",
    wanIp: wan?.wan_ip,
    wans,
  };
}
