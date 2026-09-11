"use client";

import type { Widget } from "@/lib/types";
import type { KubernetesData } from "@/lib/integrations/kubernetes";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { WidgetLoading, WidgetError, StatRow, StatusLine } from "../primitives";

export default function KubernetesDisplay({ widget }: { widget: Extract<Widget, { type: "kubernetes" }> }) {
  const label = widget.config.label || "Kubernetes";
  const { data, error } = useWidgetData<KubernetesData>(widget.id, (widget.config.refreshSeconds ?? 60) * 1000);

  if (error) return <WidgetError label={label} error={error} />;
  if (!data) return <WidgetLoading label={label} />;

  return (
    <div className="flex flex-col gap-2.5 p-3.5">
      <p className="truncate text-sm font-medium text-foreground">{label}</p>
      <StatRow
        items={[
          { value: `${data.nodesReady}/${data.nodeCount}`, caption: "nodes ready" },
          { value: data.podsRunning, caption: "pods running" },
        ]}
      />
      {(data.podsPending > 0 || data.podsFailed > 0) && (
        <StatusLine text={`${data.podsPending} pending · ${data.podsFailed} failed`} tone={data.podsFailed > 0 ? "bad" : "muted"} />
      )}
    </div>
  );
}
