"use client";

import type { Widget } from "@/lib/types";
import type { UnifiData } from "@/lib/integrations/unifi";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { ispIcon } from "@/lib/ispIcons";
import { WidgetFrame, WidgetLoading, WidgetError, StatRow, StatusLine } from "../primitives";
import WidgetLogo from "../WidgetLogo";
import Tooltip from "../Tooltip";

export default function UnifiDisplay({
  widget,
  compact,
  href,
  icon,
}: {
  widget: Extract<Widget, { type: "unifi" }>;
  compact?: boolean;
  href?: string;
  icon?: string;
}) {
  const label = widget.config.label || "UniFi Network";
  const { data, error } = useWidgetData<UnifiData>(widget.id, (widget.config.refreshSeconds ?? 60) * 1000);

  if (error) return <WidgetError label={label} error={error} compact={compact} href={href} icon={icon} />;
  if (!data) return <WidgetLoading label={label} compact={compact} href={href} icon={icon} />;

  const wanOk = data.wanStatus === "ok";
  const allDevicesOnline = data.devicesOnline === data.deviceCount;
  const offlineCount = data.deviceCount - data.devicesOnline;

  return (
    <WidgetFrame
      label={label}
      compact={compact}
      href={href}
      icon={icon}
      warning={data.deviceCount > 0 && !allDevicesOnline ? `${offlineCount} UniFi device(s) offline` : undefined}
    >
      <StatRow
        compact={compact}
        items={[
          { value: data.wirelessClients, caption: "WLAN clients" },
          { value: data.wiredClients, caption: "LAN clients" },
          { value: `${data.devicesOnline}/${data.deviceCount}`, caption: "devices online" },
        ]}
      />

      {compact ? null : data.wans.length > 0 ? (
        <div
          className="grid gap-1 border-t border-border pt-2"
          style={{ gridTemplateColumns: `repeat(${data.wans.length}, minmax(0, 1fr))` }}
        >
          {data.wans.map((wan, i) => {
            const statusTone = wan.up === false ? "text-red-400" : wan.up === true ? "text-emerald-500" : "text-muted";
            const body = (
              <div className="flex w-full flex-col items-center gap-0.5 text-center">
                <span className="truncate text-[10px] font-medium text-muted">ISP {i + 1}</span>
                <div className="flex h-6 w-6 items-center justify-center">
                  <WidgetLogo icon={ispIcon(wan.ispName)} size={22} />
                </div>
                <span className={`max-w-full truncate text-[11px] ${statusTone}`}>{wan.ispName ?? "Unknown ISP"}</span>
              </div>
            );
            return (
              <div key={wan.name} className="min-w-0">
                {wan.uptimePercent != null ? (
                  <Tooltip label={`${wan.uptimePercent.toFixed(1)}% uptime`} className="w-full">
                    {body}
                  </Tooltip>
                ) : (
                  body
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <StatusLine text={`WAN: ${data.wanStatus}${data.wanIp ? ` (${data.wanIp})` : ""}`} tone={wanOk ? "good" : "bad"} />
      )}
    </WidgetFrame>
  );
}
