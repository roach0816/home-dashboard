"use client";

import type { Widget } from "@/lib/types";
import type { UnifiData } from "@/lib/integrations/unifi";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { WidgetLoading, WidgetError, StatRow, StatusLine } from "../primitives";

export default function UnifiDisplay({ widget }: { widget: Extract<Widget, { type: "unifi" }> }) {
  const label = widget.config.label || "UniFi Network";
  const { data, error } = useWidgetData<UnifiData>(widget.id);

  if (error) return <WidgetError label={label} error={error} />;
  if (!data) return <WidgetLoading label={label} />;

  const wanOk = data.wanStatus === "ok";
  return (
    <div className="flex flex-col gap-2.5 p-3.5">
      <p className="truncate text-sm font-medium text-foreground">{label}</p>
      <StatRow items={[{ value: data.clientCount, caption: "clients online" }]} />
      <StatusLine text={`WAN: ${data.wanStatus}${data.wanIp ? ` (${data.wanIp})` : ""}`} tone={wanOk ? "good" : "bad"} />
    </div>
  );
}
