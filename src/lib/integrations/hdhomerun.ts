import "server-only";
import type { HdhomerunConfig } from "@/lib/types";
import { integrationFetch } from "@/lib/insecureFetch";
import { assertOk } from "./util";

export type HdhomerunData = {
  friendlyName: string;
  modelNumber: string;
  tunerCount: number;
  tunersInUse: number;
};

export async function fetchHdhomerunData(config: HdhomerunConfig): Promise<HdhomerunData> {
  const base = `http://${config.host}:${config.port || 80}`;

  const discoverRes = await integrationFetch(`${base}/discover.json`, { cache: "no-store" });
  await assertOk(discoverRes, "HDHomeRun");
  const discover = (await discoverRes.json()) as {
    FriendlyName?: string;
    ModelNumber?: string;
    TunerCount?: number;
  };

  const statusRes = await integrationFetch(`${base}/status.json`, { cache: "no-store" });
  await assertOk(statusRes, "HDHomeRun");
  // Each array entry is one tuner; a tuner currently tuned to something has
  // a non-null VctNumber (the virtual channel it's on) — same signal used
  // by other open-source HDHomeRun dashboard widgets.
  const status = (await statusRes.json()) as Array<{ VctNumber?: string | number | null }>;

  return {
    friendlyName: discover.FriendlyName ?? "HDHomeRun",
    modelNumber: discover.ModelNumber ?? "",
    tunerCount: discover.TunerCount ?? status.length,
    tunersInUse: status.filter((t) => t.VctNumber != null).length,
  };
}
