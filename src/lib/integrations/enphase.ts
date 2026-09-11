import "server-only";
import type { EnphaseConfig } from "@/lib/types";
import { integrationFetch } from "@/lib/insecureFetch";
import { assertOk } from "./util";

export type EnphaseData = {
  currentWatts: number;
  todayWattHours: number;
};

export async function fetchEnphaseData(
  config: EnphaseConfig,
  secrets: Record<string, string>,
): Promise<EnphaseData> {
  const token = secrets.token;
  if (!token) throw new Error("Envoy access token not configured.");

  const base = config.baseUrl.replace(/\/$/, "");
  const res = await integrationFetch(`${base}/production.json`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  await assertOk(res, "Enphase Envoy");
  const body = (await res.json()) as {
    production: Array<{ type: string; wNow?: number; whToday?: number }>;
  };

  const entry =
    body.production?.find((p) => p.type === "eim") ?? body.production?.find((p) => p.type === "inverters");
  if (!entry) throw new Error("Unexpected response from Envoy — no production reading found.");

  return { currentWatts: entry.wNow ?? 0, todayWattHours: entry.whToday ?? 0 };
}
