import "server-only";
import type { AdguardConfig } from "@/lib/types";
import { integrationFetch } from "@/lib/insecureFetch";
import { basicAuthHeader, assertOk } from "./util";

export type AdguardData = {
  queriesToday: number;
  blockedToday: number;
  blockedPercent: number;
  topBlockedDomain?: string;
};

export async function fetchAdguardData(
  config: AdguardConfig,
  secrets: Record<string, string>,
): Promise<AdguardData> {
  const { username, password } = secrets;
  if (!username || !password) throw new Error("AdGuard Home credentials not configured.");

  const base = config.baseUrl.replace(/\/$/, "");
  const res = await integrationFetch(`${base}/control/stats`, {
    headers: { Authorization: basicAuthHeader(username, password) },
    cache: "no-store",
  });
  await assertOk(res, "AdGuard Home");
  const body = (await res.json()) as {
    num_dns_queries: number;
    num_blocked_filtering: number;
    top_blocked_domains?: Array<Record<string, number>>;
  };

  const topEntry = body.top_blocked_domains?.[0];
  const topBlockedDomain = topEntry ? Object.keys(topEntry)[0] : undefined;

  return {
    queriesToday: body.num_dns_queries ?? 0,
    blockedToday: body.num_blocked_filtering ?? 0,
    blockedPercent: body.num_dns_queries ? (body.num_blocked_filtering / body.num_dns_queries) * 100 : 0,
    topBlockedDomain,
  };
}
