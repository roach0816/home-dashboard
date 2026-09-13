"use client";

import type { Widget } from "@/lib/types";
import type { UnifiData } from "@/lib/integrations/unifi";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { WidgetFrame, WidgetLoading, WidgetError, StatRow, StatusLine } from "../primitives";
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
      <StatusLine text={`WAN: ${data.wanStatus}${data.wanIp ? ` (${data.wanIp})` : ""}`} tone={wanOk ? "good" : "bad"} />
      {!compact && data.wans.length > 0 && (
        <div className="flex flex-col gap-0.5 border-t border-border pt-2">
          {data.wans.map((wan) => {
            const name = wan.ispName ? `${wan.name} — ${wan.ispName}` : wan.name;
            return (
              // No `truncate`/overflow-hidden on this line itself — that would clip the
              // hover tooltip below, since it's an absolutely-positioned descendant.
              // The inner span truncates its own text instead, via a fixed max-width.
              <p key={wan.name} className="text-[11px] text-muted">
                {wan.uptimePercent != null ? (
                  <Tooltip label={`${wan.uptimePercent.toFixed(1)}% uptime`}>
                    <span className="block max-w-[230px] truncate underline decoration-dotted underline-offset-2">
                      {name}
                    </span>
                  </Tooltip>
                ) : (
                  <span className="block max-w-[230px] truncate">{name}</span>
                )}
              </p>
            );
          })}
        </div>
      )}
    </WidgetFrame>
  );
}
