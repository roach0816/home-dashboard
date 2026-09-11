import "server-only";
import type { UptimeKumaConfig } from "@/lib/types";
import { integrationFetch } from "@/lib/insecureFetch";
import { basicAuthHeader, assertOk, parsePrometheusText } from "./util";

export type UptimeKumaData = {
  up: number;
  down: number;
  pending: number;
};

export async function fetchUptimeKumaData(
  config: UptimeKumaConfig,
  secrets: Record<string, string>,
): Promise<UptimeKumaData> {
  const apiKey = secrets.apiKey;
  if (!apiKey) throw new Error("Uptime Kuma API key not configured.");

  const base = config.baseUrl.replace(/\/$/, "");
  const res = await integrationFetch(`${base}/metrics`, {
    headers: { Authorization: basicAuthHeader("", apiKey) },
    cache: "no-store",
  });
  await assertOk(res, "Uptime Kuma");
  const text = await res.text();
  const metrics = parsePrometheusText(text);
  const statuses = metrics.get("monitor_status") ?? [];

  let up = 0;
  let down = 0;
  let pending = 0;
  for (const { value } of statuses) {
    if (value === 1) up += 1;
    else if (value === 0) down += 1;
    else pending += 1;
  }

  return { up, down, pending };
}
