import "server-only";
import type { ProxmoxConfig } from "@/lib/types";
import { integrationFetch } from "@/lib/insecureFetch";
import { assertOk } from "./util";

export type ProxmoxData = {
  nodeCount: number;
  avgCpuPercent: number;
  memUsedPercent: number;
  runningGuests: number;
};

export async function fetchProxmoxData(
  config: ProxmoxConfig,
  secrets: Record<string, string>,
): Promise<ProxmoxData> {
  const apiToken = secrets.apiToken;
  if (!apiToken) throw new Error("Proxmox API token not configured.");

  const base = config.baseUrl.replace(/\/$/, "");
  const headers = { Authorization: `PVEAPIToken=${apiToken}` };

  const nodesRes = await integrationFetch(`${base}/api2/json/nodes`, {
    headers,
    insecure: config.insecureTls,
    cache: "no-store",
  });
  await assertOk(nodesRes, "Proxmox");
  const nodesBody = (await nodesRes.json()) as {
    data: Array<{ cpu: number; maxmem: number; mem: number; status: string }>;
  };
  const nodes = nodesBody.data ?? [];
  const onlineNodes = nodes.filter((n) => n.status === "online");
  const avgCpuPercent = onlineNodes.length
    ? (onlineNodes.reduce((sum, n) => sum + (n.cpu ?? 0), 0) / onlineNodes.length) * 100
    : 0;
  const totalMem = onlineNodes.reduce((sum, n) => sum + (n.maxmem ?? 0), 0);
  const usedMem = onlineNodes.reduce((sum, n) => sum + (n.mem ?? 0), 0);
  const memUsedPercent = totalMem ? (usedMem / totalMem) * 100 : 0;

  const resourcesRes = await integrationFetch(`${base}/api2/json/cluster/resources?type=vm`, {
    headers,
    insecure: config.insecureTls,
    cache: "no-store",
  });
  await assertOk(resourcesRes, "Proxmox");
  const resourcesBody = (await resourcesRes.json()) as { data: Array<{ status: string }> };
  const runningGuests = (resourcesBody.data ?? []).filter((r) => r.status === "running").length;

  return { nodeCount: nodes.length, avgCpuPercent, memUsedPercent, runningGuests };
}
