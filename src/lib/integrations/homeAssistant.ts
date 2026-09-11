import "server-only";
import type { HomeAssistantConfig } from "@/lib/types";
import { integrationFetch } from "@/lib/insecureFetch";
import { assertOk } from "./util";

export type HomeAssistantData = {
  totalEntities: number;
  unavailable: number;
  version?: string;
};

export async function fetchHomeAssistantData(
  config: HomeAssistantConfig,
  secrets: Record<string, string>,
): Promise<HomeAssistantData> {
  const token = secrets.token;
  if (!token) throw new Error("Long-lived access token not configured.");

  const res = await integrationFetch(`${config.baseUrl.replace(/\/$/, "")}/api/states`, {
    headers: { Authorization: `Bearer ${token}` },
    insecure: config.insecureTls,
    cache: "no-store",
  });
  await assertOk(res, "Home Assistant");
  const states = (await res.json()) as Array<{ state: string }>;
  const unavailable = states.filter((s) => s.state === "unavailable" || s.state === "unknown").length;

  return { totalEntities: states.length, unavailable };
}
