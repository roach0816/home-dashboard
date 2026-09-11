import "server-only";
import type { PortainerConfig } from "@/lib/types";
import { integrationFetch } from "@/lib/insecureFetch";
import { assertOk } from "./util";

export type PortainerData = {
  environmentCount: number;
  runningContainers: number;
  stoppedContainers: number;
};

export async function fetchPortainerData(
  config: PortainerConfig,
  secrets: Record<string, string>,
): Promise<PortainerData> {
  const apiKey = secrets.apiKey;
  if (!apiKey) throw new Error("Portainer API access token not configured.");

  const base = config.baseUrl.replace(/\/$/, "");
  const res = await integrationFetch(`${base}/api/endpoints`, {
    headers: { "X-API-Key": apiKey },
    insecure: config.insecureTls,
    cache: "no-store",
  });
  await assertOk(res, "Portainer");
  const body = (await res.json()) as Array<{
    Snapshots?: Array<{ RunningContainerCount: number; StoppedContainerCount: number }>;
  }>;

  let runningContainers = 0;
  let stoppedContainers = 0;
  for (const env of body) {
    const snapshot = env.Snapshots?.[env.Snapshots.length - 1];
    if (snapshot) {
      runningContainers += snapshot.RunningContainerCount ?? 0;
      stoppedContainers += snapshot.StoppedContainerCount ?? 0;
    }
  }

  return { environmentCount: body.length, runningContainers, stoppedContainers };
}
