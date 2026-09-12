import "server-only";
import type { AdguardConfig, AdguardNode } from "@/lib/types";
import { integrationFetch } from "@/lib/insecureFetch";
import { basicAuthHeader, assertOk, describeError } from "./util";

export type AdguardStats = {
  queriesToday: number;
  blockedToday: number;
  blockedPercent: number;
  malwarePercent: number;
  adultPercent: number;
  topBlockedDomain?: string;
};

export type AdguardNodeResult = {
  id: string;
  label: string;
} & ({ ok: true; stats: AdguardStats } | { ok: false; error: string });

export type AdguardData = {
  nodes: AdguardNodeResult[];
  /** Aggregated across every node that answered successfully; omitted fields default to 0 when none did. */
  combined: AdguardStats;
};

function percentOf(n: number | undefined, total: number): number {
  return total ? ((n ?? 0) / total) * 100 : 0;
}

/** Secrets are stored per-node under "<nodeId>:username" / "<nodeId>:password", with one
 * exception: a node with the legacy id "default" (migrated from the old single-node config)
 * falls back to the old flat "username"/"password" keys used before this widget supported
 * multiple nodes, so upgrading doesn't strand an already-configured widget's credentials. */
function nodeCredentials(node: AdguardNode, secrets: Record<string, string>) {
  const username = secrets[`${node.id}:username`] ?? (node.id === "default" ? secrets.username : undefined);
  const password = secrets[`${node.id}:password`] ?? (node.id === "default" ? secrets.password : undefined);
  return { username, password };
}

async function fetchNodeStats(node: AdguardNode, secrets: Record<string, string>): Promise<AdguardStats> {
  const { username, password } = nodeCredentials(node, secrets);
  if (!username || !password) throw new Error("Credentials not configured.");

  const base = node.baseUrl.replace(/\/$/, "");
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

  return {
    queriesToday: total,
    blockedToday: body.num_blocked_filtering ?? 0,
    blockedPercent: percentOf(body.num_blocked_filtering, total),
    malwarePercent: percentOf(body.num_replaced_safebrowsing, total),
    adultPercent: percentOf(body.num_replaced_parental, total),
    topBlockedDomain,
  };
}

export async function fetchAdguardData(
  config: AdguardConfig,
  secrets: Record<string, string>,
): Promise<AdguardData> {
  const results = await Promise.all(
    config.nodes.map(async (node): Promise<AdguardNodeResult> => {
      const label = node.label || node.baseUrl;
      try {
        const stats = await fetchNodeStats(node, secrets);
        return { id: node.id, label, ok: true, stats };
      } catch (err) {
        return { id: node.id, label, ok: false, error: describeError(err, "AdGuard Home") };
      }
    }),
  );

  const okResults = results.filter((r): r is Extract<AdguardNodeResult, { ok: true }> & { label: string } => r.ok);
  if (okResults.length === 0) {
    throw new Error(results[0] && !results[0].ok ? results[0].error : "No AdGuard nodes reachable.");
  }

  const queriesToday = okResults.reduce((sum, r) => sum + r.stats.queriesToday, 0);
  const blockedToday = okResults.reduce((sum, r) => sum + r.stats.blockedToday, 0);
  const malwareToday = okResults.reduce(
    (sum, r) => sum + (r.stats.malwarePercent * r.stats.queriesToday) / 100,
    0,
  );
  const adultToday = okResults.reduce((sum, r) => sum + (r.stats.adultPercent * r.stats.queriesToday) / 100, 0);

  return {
    nodes: results,
    combined: {
      queriesToday,
      blockedToday,
      blockedPercent: percentOf(blockedToday, queriesToday),
      malwarePercent: percentOf(malwareToday, queriesToday),
      adultPercent: percentOf(adultToday, queriesToday),
    },
  };
}
