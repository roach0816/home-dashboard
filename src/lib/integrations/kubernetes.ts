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
};

export async function fetchKubernetesData(
  config: KubernetesConfig,
  secrets: Record<string, string>,
): Promise<KubernetesData> {
  const token = secrets.token;
  if (!token) throw new Error("Bearer token not configured.");

  const base = config.apiUrl.replace(/\/$/, "");
  const headers = { Authorization: `Bearer ${token}` };

  const nodesRes = await integrationFetch(`${base}/api/v1/nodes`, {
    headers,
    insecure: config.insecureTls,
    cache: "no-store",
  });
  await assertOk(nodesRes, "Kubernetes API");
  const nodesBody = (await nodesRes.json()) as {
    items: Array<{ status: { conditions: Array<{ type: string; status: string }> } }>;
  };
  const nodes = nodesBody.items ?? [];
  const nodesReady = nodes.filter((n) =>
    n.status.conditions?.some((c) => c.type === "Ready" && c.status === "True"),
  ).length;

  const podsRes = await integrationFetch(`${base}/api/v1/pods`, {
    headers,
    insecure: config.insecureTls,
    cache: "no-store",
  });
  await assertOk(podsRes, "Kubernetes API");
  const podsBody = (await podsRes.json()) as { items: Array<{ status: { phase: string } }> };
  const pods = podsBody.items ?? [];

  return {
    nodeCount: nodes.length,
    nodesReady,
    podsRunning: pods.filter((p) => p.status.phase === "Running").length,
    podsPending: pods.filter((p) => p.status.phase === "Pending").length,
    podsFailed: pods.filter((p) => p.status.phase === "Failed").length,
  };
}
