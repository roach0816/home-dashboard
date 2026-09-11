import "server-only";
import type { ProxmoxConfig } from "@/lib/types";
import { integrationFetch } from "@/lib/insecureFetch";
import { assertOk } from "./util";

export type ProxmoxData = {
  nodeCount: number;
  avgCpuPercent: number;
  memUsedPercent: number;
  memUsedBytes: number;
  memTotalBytes: number;
  diskUsedPercent: number;
  vmsRunning: number;
  vmsTotal: number;
  ctsRunning: number;
  ctsTotal: number;
};

type NodeStatus = {
  cpu?: number;
  memory?: { total?: number; used?: number };
  rootfs?: { total?: number; used?: number };
};

export async function fetchProxmoxData(
  config: ProxmoxConfig,
  secrets: Record<string, string>,
): Promise<ProxmoxData> {
  const apiToken = secrets.apiToken;
  if (!apiToken) throw new Error("Proxmox API token not configured.");

  const base = config.baseUrl.replace(/\/$/, "");
  const headers = { Authorization: `PVEAPIToken=${apiToken}` };
  const insecure = config.insecureTls;

  const nodesRes = await integrationFetch(`${base}/api2/json/nodes`, { headers, insecure, cache: "no-store" });
  await assertOk(nodesRes, "Proxmox");
  const nodesBody = (await nodesRes.json()) as { data: Array<{ node: string; status: string }> };
  const nodes = nodesBody.data ?? [];
  const onlineNodes = nodes.filter((n) => n.status === "online");

  // The /nodes list's cpu/mem fields are frequently stale or zero; the
  // per-node status endpoint is what Proxmox's own UI uses for the exact
  // numbers shown on a node's Summary page, so fetch that per node instead.
  const statuses = await Promise.all(
    onlineNodes.map(async (n) => {
      try {
        const res = await integrationFetch(`${base}/api2/json/nodes/${n.node}/status`, {
          headers,
          insecure,
          cache: "no-store",
        });
        if (!res.ok) return null;
        const body = (await res.json()) as { data: NodeStatus };
        return body.data;
      } catch {
        return null;
      }
    }),
  );
  const validStatuses = statuses.filter((s): s is NodeStatus => s !== null);

  const avgCpuPercent = validStatuses.length
    ? (validStatuses.reduce((sum, s) => sum + (s.cpu ?? 0), 0) / validStatuses.length) * 100
    : 0;
  const memUsedBytes = validStatuses.reduce((sum, s) => sum + (s.memory?.used ?? 0), 0);
  const memTotalBytes = validStatuses.reduce((sum, s) => sum + (s.memory?.total ?? 0), 0);
  const diskUsedBytes = validStatuses.reduce((sum, s) => sum + (s.rootfs?.used ?? 0), 0);
  const diskTotalBytes = validStatuses.reduce((sum, s) => sum + (s.rootfs?.total ?? 0), 0);

  // No generic "vm" filter value exists on this endpoint — the real type
  // values are qemu/lxc/node/storage/sdn, so fetch everything and filter
  // client-side (below) rather than filtering (to nothing) server-side.
  const resourcesRes = await integrationFetch(`${base}/api2/json/cluster/resources`, {
    headers,
    insecure,
    cache: "no-store",
  });
  await assertOk(resourcesRes, "Proxmox");
  const resourcesBody = (await resourcesRes.json()) as {
    data: Array<{ type: string; status: string }>;
  };
  const guests = resourcesBody.data ?? [];
  const vms = guests.filter((g) => g.type === "qemu");
  const cts = guests.filter((g) => g.type === "lxc");

  return {
    nodeCount: nodes.length,
    avgCpuPercent,
    memUsedPercent: memTotalBytes ? (memUsedBytes / memTotalBytes) * 100 : 0,
    memUsedBytes,
    memTotalBytes,
    diskUsedPercent: diskTotalBytes ? (diskUsedBytes / diskTotalBytes) * 100 : 0,
    vmsRunning: vms.filter((v) => v.status === "running").length,
    vmsTotal: vms.length,
    ctsRunning: cts.filter((c) => c.status === "running").length,
    ctsTotal: cts.length,
  };
}
