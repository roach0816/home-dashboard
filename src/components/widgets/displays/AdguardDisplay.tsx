"use client";

import { useState } from "react";
import type { Widget } from "@/lib/types";
import type { AdguardData, AdguardStats } from "@/lib/integrations/adguard";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { WidgetFrame, WidgetLoading, WidgetError, StatRow, StatusLine } from "../primitives";

function StatsView({ stats, compact }: { stats: AdguardStats; compact?: boolean }) {
  if (compact) {
    return (
      <StatRow
        compact
        items={[
          { value: stats.queriesToday.toLocaleString(), caption: "queries" },
          { value: Math.round(stats.blockedPercent), unit: "%", caption: "blocked" },
        ]}
      />
    );
  }
  return (
    <>
      <StatRow
        items={[
          { value: stats.queriesToday.toLocaleString(), caption: "DNS queries" },
          { value: Math.round(stats.blockedPercent), unit: "%", caption: "blocked by filters" },
        ]}
      />
      <StatRow
        items={[
          { value: Math.round(stats.malwarePercent), unit: "%", caption: "malware/phishing" },
          { value: Math.round(stats.adultPercent), unit: "%", caption: "adult websites" },
        ]}
      />
      {stats.topBlockedDomain && <StatusLine text={`Top blocked: ${stats.topBlockedDomain}`} />}
    </>
  );
}

export default function AdguardDisplay({
  widget,
  compact,
}: {
  widget: Extract<Widget, { type: "adguard" }>;
  compact?: boolean;
}) {
  const label = widget.config.label || "AdGuard Home";
  const { data, error } = useWidgetData<AdguardData>(widget.id, (widget.config.refreshSeconds ?? 300) * 1000);
  const [selected, setSelected] = useState<string>("combined");

  if (error) return <WidgetError label={label} error={error} compact={compact} />;
  if (!data) return <WidgetLoading label={label} compact={compact} />;

  const showTabs = data.nodes.length > 1;
  const selectedNode = selected === "combined" ? undefined : data.nodes.find((n) => n.id === selected);

  return (
    <WidgetFrame label={label} compact={compact}>
      {showTabs && (
        <div className="-mt-1 flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setSelected("combined")}
            className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
              selected === "combined" ? "bg-accent text-white" : "bg-surface-3 text-muted hover:text-foreground"
            }`}
          >
            All
          </button>
          {data.nodes.map((node) => (
            <button
              key={node.id}
              type="button"
              onClick={() => setSelected(node.id)}
              className={`truncate rounded px-1.5 py-0.5 text-[11px] font-medium ${
                selected === node.id ? "bg-accent text-white" : "bg-surface-3 text-muted hover:text-foreground"
              }`}
            >
              {node.label}
            </button>
          ))}
        </div>
      )}

      {!selectedNode && <StatsView stats={data.combined} compact={compact} />}
      {selectedNode?.ok && <StatsView stats={selectedNode.stats} compact={compact} />}
      {selectedNode && !selectedNode.ok && <p className="text-xs text-red-400">{selectedNode.error}</p>}
    </WidgetFrame>
  );
}
