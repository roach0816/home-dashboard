import "server-only";
import type { PiholeConfig } from "@/lib/types";
import { integrationFetch } from "@/lib/insecureFetch";
import { assertOk } from "./util";

export type PiholeData = {
  queriesToday: number;
  blockedToday: number;
  blockedPercent: number;
  domainsOnBlocklist: number;
};

export async function fetchPiholeData(
  config: PiholeConfig,
  secrets: Record<string, string>,
): Promise<PiholeData> {
  const password = secrets.password;
  if (!password) throw new Error("Pi-hole password not configured.");

  const base = config.baseUrl.replace(/\/$/, "");
  const authRes = await integrationFetch(`${base}/api/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
    cache: "no-store",
  });
  await assertOk(authRes, "Pi-hole");
  const authBody = (await authRes.json()) as { session: { sid: string; valid: boolean } };
  if (!authBody.session?.valid) throw new Error("Pi-hole rejected the password.");

  const statsRes = await integrationFetch(`${base}/api/stats/summary`, {
    headers: { "X-FTL-SID": authBody.session.sid },
    cache: "no-store",
  });
  await assertOk(statsRes, "Pi-hole");
  const statsBody = (await statsRes.json()) as {
    queries: { total: number; blocked: number; percent_blocked: number };
    gravity: { domains_being_blocked: number };
  };

  return {
    queriesToday: statsBody.queries.total,
    blockedToday: statsBody.queries.blocked,
    blockedPercent: statsBody.queries.percent_blocked,
    domainsOnBlocklist: statsBody.gravity.domains_being_blocked,
  };
}
