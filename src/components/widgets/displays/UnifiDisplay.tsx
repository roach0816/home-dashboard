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

  return (
    <WidgetFrame label={label} compact={compact} href={href} icon={icon}>
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

      {compact ? null : data.wans.length > 0 ? (
        <div className="flex gap-1 border-t border-border pt-2.5">
          {data.wans.map((wan) => {
            const statusTone = wan.up === false ? "text-red-400" : wan.up === true ? "text-emerald-500" : "text-muted";
            const statusText = wan.up === false ? "Down" : wan.ispName ?? "Unknown ISP";
            const body = (
              <div className="flex w-full flex-col items-center gap-1 text-center">
                <span className="truncate text-[10px] font-medium text-muted">{wan.name}</span>
                <WidgetLogo icon={ispIcon(wan.ispName)} size={30} />
                <span className={`max-w-full truncate text-[11px] ${statusTone}`}>{statusText}</span>
              </div>
            );
            return (
              <div key={wan.name} className="min-w-0 flex-1">
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
