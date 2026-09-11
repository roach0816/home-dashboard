import "server-only";
import type { NextcloudConfig } from "@/lib/types";
import { integrationFetch } from "@/lib/insecureFetch";
import { basicAuthHeader, assertOk } from "./util";

export type NextcloudData = {
  activeUsers24h: number;
  freeBytes: number;
};

export async function fetchNextcloudData(
  config: NextcloudConfig,
  secrets: Record<string, string>,
): Promise<NextcloudData> {
  const { username, appPassword } = secrets;
  if (!username || !appPassword) throw new Error("Nextcloud credentials not configured.");

  const base = config.baseUrl.replace(/\/$/, "");
  const res = await integrationFetch(`${base}/ocs/v2.php/apps/serverinfo/api/v1/info?format=json`, {
    headers: {
      Authorization: basicAuthHeader(username, appPassword),
      "OCS-APIREQUEST": "true",
    },
    cache: "no-store",
  });
  await assertOk(res, "Nextcloud");
  const body = (await res.json()) as {
    ocs: {
      data: {
        activeUsers?: { last24hours?: number };
        nextcloud?: { system?: { freespace?: number } };
      };
    };
  };

  return {
    activeUsers24h: body.ocs.data.activeUsers?.last24hours ?? 0,
    freeBytes: body.ocs.data.nextcloud?.system?.freespace ?? 0,
  };
}
