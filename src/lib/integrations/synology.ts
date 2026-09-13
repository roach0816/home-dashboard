import "server-only";
import type { SynologyConfig } from "@/lib/types";
import { integrationFetch } from "@/lib/insecureFetch";
import { assertOk } from "./util";

export type SynologyData = {
  volumeCount: number;
  usedBytes: number;
  totalBytes: number;
  usedPercent: number;
  /** Volumes not reporting "normal" status (degraded, crashed, etc). */
  degradedVolumes: number;
};

const AUTH_API = "SYNO.API.Auth";
const STORAGE_API = "SYNO.Storage.CGI.Storage";

/**
 * DSM API paths/versions vary by app and DSM release (some route through
 * the modern entry.cgi, others keep a dedicated legacy .cgi) — resolved via
 * SYNO.API.Info rather than hardcoded, matching how DSM's own API browser
 * and the widely-used python-synology client do it.
 */
async function resolveApiPaths(
  base: string,
  insecure: boolean | undefined,
): Promise<Record<string, { path: string; maxVersion: number }>> {
  const res = await integrationFetch(
    `${base}/webapi/query.cgi?api=SYNO.API.Info&version=1&method=query&query=${AUTH_API},${STORAGE_API}`,
    { insecure, cache: "no-store" },
  );
  await assertOk(res, "Synology DSM");
  const body = (await res.json()) as {
    success?: boolean;
    data?: Record<string, { path: string; maxVersion: number }>;
  };
  if (!body.success || !body.data) throw new Error("Synology DSM did not return API info.");
  return body.data;
}

async function login(
  base: string,
  authPath: string,
  authVersion: number,
  username: string,
  password: string,
  insecure: boolean | undefined,
): Promise<string> {
  const params = new URLSearchParams({
    api: AUTH_API,
    version: String(authVersion),
    method: "login",
    account: username,
    passwd: password,
    session: "HomeDashboard",
    format: "sid",
  });
  const res = await integrationFetch(`${base}/webapi/${authPath}?${params.toString()}`, {
    insecure,
    cache: "no-store",
  });
  await assertOk(res, "Synology DSM");
  const body = (await res.json()) as { success?: boolean; data?: { sid?: string }; error?: { code?: number } };
  if (!body.success || !body.data?.sid) {
    if (body.error?.code === 400) throw new Error("Synology DSM login failed: invalid username or password.");
    if (body.error?.code === 401) throw new Error("Synology DSM login failed: account disabled.");
    if (body.error?.code === 403 || body.error?.code === 404) {
      throw new Error("Synology DSM login failed: this account requires 2-factor authentication.");
    }
    throw new Error(`Synology DSM login failed (error ${body.error?.code ?? "unknown"}).`);
  }
  return body.data.sid;
}

export async function fetchSynologyData(
  config: SynologyConfig,
  secrets: Record<string, string>,
): Promise<SynologyData> {
  const { username, password } = secrets;
  if (!username || !password) throw new Error("Synology DSM credentials not configured.");

  const base = config.baseUrl.replace(/\/$/, "");
  const insecure = config.insecureTls;

  const apis = await resolveApiPaths(base, insecure);
  const auth = apis[AUTH_API];
  const storage = apis[STORAGE_API];
  if (!auth || !storage) throw new Error("Synology DSM doesn't expose the required APIs.");

  const sid = await login(base, auth.path, auth.maxVersion, username, password, insecure);

  const storageParams = new URLSearchParams({
    api: STORAGE_API,
    version: String(storage.maxVersion),
    method: "load_info",
    _sid: sid,
  });
  const storageRes = await integrationFetch(`${base}/webapi/${storage.path}?${storageParams.toString()}`, {
    insecure,
    cache: "no-store",
  });
  await assertOk(storageRes, "Synology DSM");
  const storageBody = (await storageRes.json()) as {
    success?: boolean;
    data?: { volumes?: Array<{ status?: string; size?: { total?: string; used?: string } }> };
  };
  if (!storageBody.success || !storageBody.data) throw new Error("Synology DSM did not return storage data.");

  const volumes = storageBody.data.volumes ?? [];
  const totalBytes = volumes.reduce((sum, v) => sum + Number(v.size?.total ?? 0), 0);
  const usedBytes = volumes.reduce((sum, v) => sum + Number(v.size?.used ?? 0), 0);

  return {
    volumeCount: volumes.length,
    usedBytes,
    totalBytes,
    usedPercent: totalBytes ? (usedBytes / totalBytes) * 100 : 0,
    degradedVolumes: volumes.filter((v) => v.status && v.status !== "normal").length,
  };
}
