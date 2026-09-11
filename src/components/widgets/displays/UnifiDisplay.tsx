"use client";

import type { Widget } from "@/lib/types";
import type { UnifiData } from "@/lib/integrations/unifi";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { WidgetLoading, WidgetError, StatRow, StatusLine } from "../primitives";

export default function UnifiDisplay({ widget }: { widget: Extract<Widget, { type: "unifi" }> }) {
  const label = widget.config.label || "UniFi Network";
  const { data, error } = useWidgetData<UnifiData>(widget.id, (widget.config.refreshSeconds ?? 60) * 1000);

  if (error) return <WidgetError label={label} error={error} />;
  if (!data) return <WidgetLoading label={label} />;

  const wanOk = data.wanStatus === "ok";
  const allDevicesOnline = data.devicesOnline === data.deviceCount;

  return (
    <div className="flex flex-col gap-2.5 p-3.5">
      <p className="truncate text-sm font-medium text-foreground">{label}</p>
      <StatRow
        items={[
          { value: data.wirelessClients, caption: "WLAN clients" },
          { value: data.wiredClients, caption: "LAN clients" },
          { value: `${data.devicesOnline}/${data.deviceCount}`, caption: "devices online" },
        ]}
      />
      {data.deviceCount > 0 && !allDevicesOnline && (
        <StatusLine text={`${data.deviceCount - data.devicesOnline} UniFi device(s) offline`} tone="bad" />
      )}
      <StatusLine text={`WAN: ${data.wanStatus}${data.wanIp ? ` (${data.wanIp})` : ""}`} tone={wanOk ? "good" : "bad"} />
      {data.wans.length > 0 && (
        <div className="flex flex-col gap-0.5 border-t border-border pt-2">
          {data.wans.map((wan) => (
            <p key={wan.name} className="truncate text-[11px] text-muted">
              {wan.name}
              {wan.ispName ? ` — ${wan.ispName}` : ""}
              {wan.uptimePercent != null ? ` (${wan.uptimePercent.toFixed(1)}% uptime)` : ""}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
