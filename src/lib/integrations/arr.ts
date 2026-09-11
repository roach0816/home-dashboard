import "server-only";
import { integrationFetch } from "@/lib/insecureFetch";
import { assertOk } from "./util";

export type ArrData = {
  queueCount: number;
  upcomingCount: number;
};

/** Shared client for Sonarr/Radarr (identical v3 API shape). */
export async function fetchArrData(
  baseUrl: string,
  apiKey: string,
  calendarDays: number,
  label: string,
): Promise<ArrData> {
  const base = baseUrl.replace(/\/$/, "");
  const headers = { "X-Api-Key": apiKey };

  const queueRes = await integrationFetch(`${base}/api/v3/queue`, { headers, cache: "no-store" });
  await assertOk(queueRes, label);
  const queueBody = (await queueRes.json()) as { totalRecords: number };

  const start = new Date();
  const end = new Date(start.getTime() + calendarDays * 24 * 60 * 60 * 1000);
  const params = new URLSearchParams({
    start: start.toISOString(),
    end: end.toISOString(),
    includeSeries: "false",
  });
  const calendarRes = await integrationFetch(`${base}/api/v3/calendar?${params}`, { headers, cache: "no-store" });
  await assertOk(calendarRes, label);
  const calendarBody = (await calendarRes.json()) as unknown[];

  return { queueCount: queueBody.totalRecords ?? 0, upcomingCount: calendarBody.length };
}
