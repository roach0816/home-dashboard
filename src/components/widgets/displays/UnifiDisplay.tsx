"use client";

import type { Widget } from "@/lib/types";
import type { UnifiData } from "@/lib/integrations/unifi";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { WidgetFrame, WidgetLoading, WidgetError, StatRow, StatusLine } from "../primitives";
import Tooltip from "../Tooltip";

export default function UnifiDisplay({
  widget,
  compact,
}: {
  widget: Extract<Widget, { type: "unifi" }>;
  compact?: boolean;
}) {
  const label = widget.config.label || "UniFi Network";
  const { data, error } = useWidgetData<UnifiData>(widget.id, (widget.config.refreshSeconds ?? 60) * 1000);

  if (error) return <WidgetError label={label} error={error} compact={compact} />;
  if (!data) return <WidgetLoading label={label} compact={compact} />;

  const wanOk = data.wanStatus === "ok";
  const allDevicesOnline = data.devicesOnline === data.deviceCount;

  return (
    <WidgetFrame label={label} compact={compact}>
      <StatRow
        compact={compact}
        items={[
          { value: data.wirelessClients, caption: "WLAN clients" },
          { value: data.wiredClients, caption: "LAN clients" },
          { value: `${data.devicesOnline}/${data.deviceCount}`, caption: "devices online" },
        ]}
      />
      {!compact && data.deviceCount > 0 && !allDevicesOnline && (
        <StatusLine text={`${data.deviceCount - data.devicesOnline} UniFi device(s) offline`} tone="bad" />
      )}
      <StatusLine text={`WAN: ${data.wanStatus}${data.wanIp ? ` (${data.wanIp})` : ""}`} tone={wanOk ? "good" : "bad"} />
      {!compact && data.wans.length > 0 && (
        <div className="flex flex-col gap-0.5 border-t border-border pt-2">
          {data.wans.map((wan) => {
            const name = wan.ispName ? `${wan.name} — ${wan.ispName}` : wan.name;
            return (
              <p key={wan.name} className="truncate text-[11px] text-muted">
                {wan.uptimePercent != null ? (
                  <Tooltip label={`${wan.uptimePercent.toFixed(1)}% uptime`}>
                    <span className="truncate underline decoration-dotted underline-offset-2">{name}</span>
                  </Tooltip>
                ) : (
                  name
                )}
              </p>
            );
          })}
        </div>
      )}
    </WidgetFrame>
  );
}
