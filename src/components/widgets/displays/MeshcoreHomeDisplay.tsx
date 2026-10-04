"use client";

import type { Widget } from "@/lib/types";
import type { MeshcoreHomeData } from "@/lib/integrations/meshcoreHome";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { WidgetFrame, WidgetLoading, WidgetError, StatRow, StatusLine, type DataSource } from "../primitives";

const STATE_LABEL: Record<string, string> = {
  connected: "Connected",
  connecting: "Connecting…",
  starting: "Starting…",
  backoff: "Reconnecting…",
  paused: "Radio paused",
  disabled: "Radio disabled",
  not_configured: "No radio configured",
  lock_unavailable: "Radio used by another instance",
};

function stateTone(state: string): "good" | "bad" | "muted" {
  if (state === "connected") return "good";
  if (state === "backoff" || state === "lock_unavailable") return "bad";
  return "muted";
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function MeshcoreHomeDisplay({
  widget,
  compact,
  href,
  icon,
  sources,
}: {
  widget: Extract<Widget, { type: "meshcore-home" }>;
  compact?: boolean;
  href?: string;
  icon?: string;
  sources?: DataSource[];
}) {
  const label = widget.config.label || "MeshCore Home";
  const { data, error } = useWidgetData<MeshcoreHomeData>(widget.id, (widget.config.refreshSeconds ?? 60) * 1000);

  if (error) return <WidgetError label={label} error={error} compact={compact} href={href} icon={icon} sources={sources} />;
  if (!data) return <WidgetLoading label={label} compact={compact} href={href} icon={icon} sources={sources} />;

  const radioLine = [
    STATE_LABEL[data.radioState] ?? data.radioState,
    data.radioName,
    data.uptimeSeconds !== undefined ? `up ${formatUptime(data.uptimeSeconds)}` : undefined,
    data.isSimulated ? "simulated" : undefined,
  ]
    .filter(Boolean)
    .join(" · ");

  const deviceLine = [
    data.model,
    data.firmware && `fw ${data.firmware}`,
    data.frequencyMHz !== undefined && `${data.frequencyMHz} MHz`,
    data.spreadingFactor !== undefined && `SF${data.spreadingFactor}`,
    data.bandwidthKHz !== undefined && `BW ${data.bandwidthKHz} kHz`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <WidgetFrame label={label} compact={compact} href={href} icon={icon} sources={sources}>
      <StatRow
        compact={compact}
        items={[
          { value: data.received.toLocaleString(), caption: "received" },
          { value: data.sent.toLocaleString(), caption: "sent" },
          { value: data.contacts.toLocaleString(), caption: "contacts" },
          { value: data.unread.toLocaleString(), caption: "unread" },
        ]}
      />
      {!compact && (
        <>
          <StatusLine text={radioLine} tone={stateTone(data.radioState)} />
          {data.radioDetail && <StatusLine text={data.radioDetail} tone="bad" />}
          {deviceLine && <StatusLine text={deviceLine} />}
          <StatusLine
            text={`${data.storedMessages.toLocaleString()} messages archived · ${data.activeChannels} channel${data.activeChannels === 1 ? "" : "s"}${data.openGaps > 0 ? ` · ${data.openGaps} open gap${data.openGaps === 1 ? "" : "s"}` : ""}`}
            tone={data.openGaps > 0 ? "bad" : "muted"}
          />
        </>
      )}
    </WidgetFrame>
  );
}
