import "server-only";
import type { UnifiConfig } from "@/lib/types";
import { integrationFetch } from "@/lib/insecureFetch";
import { assertOk } from "./util";

export type UnifiWan = {
  name: string;
  ispName?: string;
  /** Configured plan speed, in Mbps — this is what the WAN is set up for, not a live measurement. */
  downMbps?: number;
  upMbps?: number;
  /** Live up/down, read off the gateway device's own wan1/2/3 telemetry — undefined if it couldn't be matched. */
  up?: boolean;
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

type RawWan = UnifiWan & { networkgroup?: string };

/** Best-effort — this v2 API is only on newer UniFi OS controllers. Returns [] if unsupported. */
async function fetchWanProviders(
  base: string,
  prefix: string,
  site: string,
  headers: Record<string, string>,
  insecure: boolean | undefined,
): Promise<RawWan[]> {
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

    const wans: RawWan[] = [];
    for (const entry of list) {
      const e = entry as {
        configuration?: {
          name?: string;
          wan_networkgroup?: string;
          wan_provider_capabilities?: { download_kilobits_per_second?: number; upload_kilobits_per_second?: number };
        };
        details?: { service_provider?: { name?: string } };
      };
      const name = e?.configuration?.name || e?.configuration?.wan_networkgroup;
      if (!name) continue;

      const ispName = e?.details?.service_provider?.name;
      const downKbps = e?.configuration?.wan_provider_capabilities?.download_kilobits_per_second;
      const upKbps = e?.configuration?.wan_provider_capabilities?.upload_kilobits_per_second;
      // Controllers report every WAN-capable port the hardware has, even
      // ones that were never actually set up. An unconfigured port has no
      // known ISP and no configured speed (verified against a real
      // controller: an unused WAN slot reports 0/0 kbps capacity), unlike
      // a real WAN that's simply down right now.
      if (!ispName && !downKbps && !upKbps) continue;

      wans.push({
        name,
        ispName,
        downMbps: downKbps ? Math.round(downKbps / 1000) : undefined,
        upMbps: upKbps ? Math.round(upKbps / 1000) : undefined,
        networkgroup: e?.configuration?.wan_networkgroup,
      });
    }
    return wans;
  } catch {
    return [];
  }
}

/**
 * Live per-WAN up/down, read off the gateway device's own telemetry rather
 * than derived from historical uptime stats (which could show "ok" for a
 * WAN that's down right now if it's mostly been fine over the stats
 * window). Gateway devices expose their WAN ports as wan1/wan2/wan3
 * sub-objects, each with an `up` boolean; wan_networkgroup values "WAN",
 * "WAN2", "WAN3" map onto those 1:1. Returns {} if no gateway device (with
 * this shape) is found — best-effort, matching fetchWanProviders' pattern.
 */
function gatewayWanStatus(devices: unknown[]): Record<string, boolean> {
  for (const device of devices) {
    const d = device as Record<string, { up?: boolean } | unknown>;
    if (!d.wan1 && !d.wan2) continue;
    const status: Record<string, boolean> = {};
    for (const key of ["wan1", "wan2", "wan3"]) {
      const wan = d[key] as { up?: boolean } | undefined;
      if (wan && typeof wan.up === "boolean") {
        const networkgroup = key === "wan1" ? "WAN" : `WAN${key.slice(3)}`;
        status[networkgroup] = wan.up;
      }
    }
    return status;
  }
  return {};
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
  const wanStatusByGroup = gatewayWanStatus(devices);

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

  const rawWans = await fetchWanProviders(base, prefix, site, headers, config.insecureTls);
  const wans: UnifiWan[] = rawWans.map(({ name, ispName, downMbps, upMbps, networkgroup }) => ({
    name,
    ispName,
    downMbps,
    upMbps,
    up: networkgroup ? wanStatusByGroup[networkgroup] : undefined,
  }));

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
