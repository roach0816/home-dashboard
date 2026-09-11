"use client";

import type { Widget } from "@/lib/types";
import type { KubernetesData } from "@/lib/integrations/kubernetes";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { WidgetFrame, WidgetLoading, WidgetError, StatRow, StatusLine } from "../primitives";

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

  return (
    <WidgetFrame label={label} compact={compact}>
      <StatRow
        compact={compact}
        items={[
          { value: `${data.nodesReady}/${data.nodeCount}`, caption: "nodes ready" },
          { value: data.podsRunning, caption: "pods running" },
        ]}
      />
      {!compact && (data.podsPending > 0 || data.podsFailed > 0) && (
        <StatusLine text={`${data.podsPending} pending · ${data.podsFailed} failed`} tone={data.podsFailed > 0 ? "bad" : "muted"} />
      )}
    </WidgetFrame>
  );
}
