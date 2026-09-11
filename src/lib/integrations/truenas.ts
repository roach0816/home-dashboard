import "server-only";
import type { TruenasConfig } from "@/lib/types";
import { integrationFetch } from "@/lib/insecureFetch";
import { assertOk } from "./util";

export type TruenasData = {
  poolCount: number;
  usedBytes: number;
  totalBytes: number;
  usedPercent: number;
  activeAlerts: number;
};

export async function fetchTruenasData(
  config: TruenasConfig,
  secrets: Record<string, string>,
): Promise<TruenasData> {
  const apiKey = secrets.apiKey;
  if (!apiKey) throw new Error("TrueNAS API key not configured.");

  const base = config.baseUrl.replace(/\/$/, "");
  const headers = { Authorization: `Bearer ${apiKey}` };

  const poolRes = await integrationFetch(`${base}/api/v2.0/pool`, {
    headers,
    insecure: config.insecureTls,
    cache: "no-store",
  });
  await assertOk(poolRes, "TrueNAS");
  const pools = (await poolRes.json()) as Array<{ size: number; allocated: number }>;
  const totalBytes = pools.reduce((sum, p) => sum + (p.size ?? 0), 0);
  const usedBytes = pools.reduce((sum, p) => sum + (p.allocated ?? 0), 0);

  const alertsRes = await integrationFetch(`${base}/api/v2.0/alert/list`, {
    headers,
    insecure: config.insecureTls,
    cache: "no-store",
  });
  await assertOk(alertsRes, "TrueNAS");
  const alerts = (await alertsRes.json()) as Array<{ dismissed: boolean }>;

  return {
    poolCount: pools.length,
    usedBytes,
    totalBytes,
    usedPercent: totalBytes ? (usedBytes / totalBytes) * 100 : 0,
    activeAlerts: alerts.filter((a) => !a.dismissed).length,
  };
}
