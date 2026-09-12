import "server-only";
import type { KubernetesConfig } from "@/lib/types";
import { integrationFetch } from "@/lib/insecureFetch";
import { assertOk } from "./util";

export type KubernetesData = {
  nodeCount: number;
  nodesReady: number;
  podsRunning: number;
  podsPending: number;
  podsFailed: number;
  podCapacity: number;
  deploymentCount: number;
  cpuCapacityCores: number;
  cpuRequestedCores: number;
  memCapacityBytes: number;
  memRequestedBytes: number;
  /** From the metrics-server aggregated API — undefined if it's not installed or not accessible to this token. */
  cpuUsedCores?: number;
  memUsedBytes?: number;
};

/** Parses a Kubernetes resource.Quantity string (e.g. "500m", "2", "128Mi", "4Gi") into cores or bytes. */
function parseQuantity(value: string | undefined): number {
  if (!value) return 0;
  const match = value.match(/^([0-9.eE+-]+)([EPTGMK]i|[numkKMGTPE]?)$/);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  if (!Number.isFinite(num)) return 0;
  const suffix = match[2];
  const binaryUnits: Record<string, number> = {
    Ki: 1024,
    Mi: 1024 ** 2,
    Gi: 1024 ** 3,
    Ti: 1024 ** 4,
    Pi: 1024 ** 5,
    Ei: 1024 ** 6,
  };
  const decimalUnits: Record<string, number> = {
    n: 1e-9,
    u: 1e-6,
    m: 1e-3,
    k: 1e3,
    K: 1e3,
    M: 1e6,
    G: 1e9,
    T: 1e12,
    P: 1e15,
    E: 1e18,
  };
  if (suffix in binaryUnits) return num * binaryUnits[suffix];
  if (suffix in decimalUnits) return num * decimalUnits[suffix];
  return num;
}

type ResourceList = { cpu?: string; memory?: string; pods?: string };
type NodeItem = {
  status: {
    conditions: Array<{ type: string; status: string }>;
    capacity?: ResourceList;
    allocatable?: ResourceList;
  };
};
type PodItem = {
  status: { phase: string };
  spec: { containers: Array<{ resources?: { requests?: { cpu?: string; memory?: string } } }> };
};

/** Best-effort — metrics-server may not be installed, or this token may not have access to it. */
async function fetchMetricsUsage(
  base: string,
  headers: Record<string, string>,
  insecure: boolean | undefined,
): Promise<{ cpuUsedCores: number; memUsedBytes: number } | undefined> {
  try {
    const res = await integrationFetch(`${base}/apis/metrics.k8s.io/v1beta1/nodes`, {
      headers,
      insecure,
      cache: "no-store",
    });
    if (!res.ok) return undefined;
    const body = (await res.json()) as { items?: Array<{ usage?: { cpu?: string; memory?: string } }> };
    const items = body.items ?? [];
    let cpuUsedCores = 0;
    let memUsedBytes = 0;
    for (const item of items) {
      cpuUsedCores += parseQuantity(item.usage?.cpu);
      memUsedBytes += parseQuantity(item.usage?.memory);
    }
    return { cpuUsedCores, memUsedBytes };
  } catch {
    return undefined;
  }
}

export async function fetchKubernetesData(
  config: KubernetesConfig,
  secrets: Record<string, string>,
): Promise<KubernetesData> {
  const token = secrets.token;
  if (!token) throw new Error("Bearer token not configured.");

  const base = config.apiUrl.replace(/\/$/, "");
  const headers = { Authorization: `Bearer ${token}` };
  const insecure = config.insecureTls;

  const nodesRes = await integrationFetch(`${base}/api/v1/nodes`, { headers, insecure, cache: "no-store" });
  await assertOk(nodesRes, "Kubernetes API");
  const nodesBody = (await nodesRes.json()) as { items: NodeItem[] };
  const nodes = nodesBody.items ?? [];
  const nodesReady = nodes.filter((n) =>
    n.status.conditions?.some((c) => c.type === "Ready" && c.status === "True"),
  ).length;

  let cpuCapacityCores = 0;
  let memCapacityBytes = 0;
  let podCapacity = 0;
  for (const node of nodes) {
    const resources = node.status.allocatable ?? node.status.capacity;
    cpuCapacityCores += parseQuantity(resources?.cpu);
    memCapacityBytes += parseQuantity(resources?.memory);
    podCapacity += parseQuantity(resources?.pods);
  }

  const podsRes = await integrationFetch(`${base}/api/v1/pods`, { headers, insecure, cache: "no-store" });
  await assertOk(podsRes, "Kubernetes API");
  const podsBody = (await podsRes.json()) as { items: PodItem[] };
  const pods = podsBody.items ?? [];

  let cpuRequestedCores = 0;
  let memRequestedBytes = 0;
  for (const pod of pods) {
    for (const container of pod.spec?.containers ?? []) {
      cpuRequestedCores += parseQuantity(container.resources?.requests?.cpu);
      memRequestedBytes += parseQuantity(container.resources?.requests?.memory);
    }
  }

  let deploymentCount = 0;
  try {
    const deploymentsRes = await integrationFetch(`${base}/apis/apps/v1/deployments`, {
      headers,
      insecure,
      cache: "no-store",
    });
    if (deploymentsRes.ok) {
      const deploymentsBody = (await deploymentsRes.json()) as { items?: unknown[] };
      deploymentCount = deploymentsBody.items?.length ?? 0;
    }
  } catch {
    // Best-effort — some clusters restrict this token further; not worth failing the whole widget over.
  }

  const usage = await fetchMetricsUsage(base, headers, insecure);

  return {
    nodeCount: nodes.length,
    nodesReady,
    podsRunning: pods.filter((p) => p.status.phase === "Running").length,
    podsPending: pods.filter((p) => p.status.phase === "Pending").length,
    podsFailed: pods.filter((p) => p.status.phase === "Failed").length,
    podCapacity,
    deploymentCount,
    cpuCapacityCores,
    cpuRequestedCores,
    memCapacityBytes,
    memRequestedBytes,
    cpuUsedCores: usage?.cpuUsedCores,
    memUsedBytes: usage?.memUsedBytes,
  };
}
