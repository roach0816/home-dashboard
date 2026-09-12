import "server-only";
import type { AdguardConfig } from "@/lib/types";
import { integrationFetch } from "@/lib/insecureFetch";
import { basicAuthHeader, assertOk } from "./util";

export type AdguardData = {
  queriesToday: number;
  blockedToday: number;
  blockedPercent: number;
  /** Percent of today's queries blocked by the safebrowsing module (malware/phishing). */
  malwarePercent: number;
  /** Percent of today's queries blocked by parental control (adult websites). */
  adultPercent: number;
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
    num_replaced_safebrowsing?: number;
    num_replaced_parental?: number;
    top_blocked_domains?: Array<Record<string, number>>;
  };

  const topEntry = body.top_blocked_domains?.[0];
  const topBlockedDomain = topEntry ? Object.keys(topEntry)[0] : undefined;
  const total = body.num_dns_queries ?? 0;
  const percentOf = (n: number | undefined) => (total ? ((n ?? 0) / total) * 100 : 0);

  return {
    queriesToday: total,
    blockedToday: body.num_blocked_filtering ?? 0,
    blockedPercent: percentOf(body.num_blocked_filtering),
    malwarePercent: percentOf(body.num_replaced_safebrowsing),
    adultPercent: percentOf(body.num_replaced_parental),
    topBlockedDomain,
  };
}
