"use client";

import type { Widget } from "@/lib/types";
import type { KubernetesData } from "@/lib/integrations/kubernetes";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { formatBytes } from "@/lib/format";
import { WidgetFrame, WidgetLoading, WidgetError, StatRow, StatusLine } from "../primitives";

function percentOf(used: number, total: number): number {
  return total > 0 ? Math.round((used / total) * 100) : 0;
}

export default function KubernetesDisplay({
  widget,
  compact,
}: {
  widget: Extract<Widget, { type: "kubernetes" }>;
  compact?: boolean;
}) {
  const label = widget.config.label || "Kubernetes";
  const { data, error } = useWidgetData<KubernetesData>(widget.id, (widget.config.refreshSeconds ?? 60) * 1000);

  if (error) return <WidgetError label={label} error={error} compact={compact} />;
  if (!data) return <WidgetLoading label={label} compact={compact} />;

  const hasUsage = data.cpuUsedCores != null && data.memUsedBytes != null;
  const cpuPercent = hasUsage
    ? percentOf(data.cpuUsedCores!, data.cpuCapacityCores)
    : percentOf(data.cpuRequestedCores, data.cpuCapacityCores);
  const memPercent = hasUsage
    ? percentOf(data.memUsedBytes!, data.memCapacityBytes)
    : percentOf(data.memRequestedBytes, data.memCapacityBytes);
  const cpuCaption = hasUsage ? "CPU used" : "CPU requested";
  const memCaption = hasUsage ? "memory used" : "memory requested";

  if (compact) {
    return (
      <WidgetFrame label={label} compact>
        <StatRow
          compact
          items={[
            { value: `${data.nodesReady}/${data.nodeCount}`, caption: "nodes ready" },
            { value: cpuPercent, unit: "%", caption: cpuCaption },
            { value: memPercent, unit: "%", caption: memCaption },
          ]}
        />
      </WidgetFrame>
    );
  }

  return (
    <WidgetFrame label={label}>
      <StatRow
        items={[
          { value: `${data.nodesReady}/${data.nodeCount}`, caption: "nodes ready" },
          { value: `${data.podsRunning}/${data.podCapacity}`, caption: "pods" },
          { value: data.deploymentCount, caption: "deployments" },
        ]}
      />
      <StatRow
        items={[
          { value: cpuPercent, unit: "%", caption: cpuCaption },
          { value: memPercent, unit: "%", caption: memCaption },
        ]}
      />
      {(data.podsPending > 0 || data.podsFailed > 0) && (
        <StatusLine
          text={`${data.podsPending} pending · ${data.podsFailed} failed`}
          tone={data.podsFailed > 0 ? "bad" : "muted"}
        />
      )}
      <StatusLine
        text={
          hasUsage
            ? `${formatBytes(data.memUsedBytes!)} of ${formatBytes(data.memCapacityBytes)} RAM used`
            : `${formatBytes(data.memRequestedBytes)} of ${formatBytes(data.memCapacityBytes)} RAM requested`
        }
      />
    </WidgetFrame>
  );
}
