"use client";

import type { Widget } from "@/lib/types";
import type { PingMonitorData } from "@/lib/integrations/pingMonitor";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { WidgetLoading, WidgetError, StatusLine } from "../primitives";
import SiteIcon from "../../SiteIcon";

export default function PingMonitorDisplay({
  widget,
  compact,
  href,
  icon,
}: {
  widget: Extract<Widget, { type: "ping-monitor" }>;
  compact?: boolean;
  href?: string;
  icon?: string;
}) {
  const label = widget.config.label || widget.config.host;
  const { data, error } = useWidgetData<PingMonitorData>(widget.id, (widget.config.refreshSeconds ?? 60) * 1000);

  if (error) return <WidgetError label={label} error={error} compact={compact} href={href} icon={icon} />;
  if (!data) return <WidgetLoading label={label} compact={compact} href={href} icon={icon} />;

  return (
    <div className={`flex flex-col gap-2 ${compact ? "p-2.5" : "p-3.5"}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="block truncate text-sm font-medium text-foreground hover:underline"
            >
              {label}
            </a>
          ) : (
            <p className="truncate text-sm font-medium text-foreground">{label}</p>
          )}
        </div>
        {icon && (
          <span className="shrink-0 opacity-80">
            <SiteIcon title={label} url="" icon={icon} size={18} />
          </span>
        )}
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${data.up ? "bg-emerald-500" : "bg-red-400"}`} />
      </div>
      <StatusLine
        text={
          data.up
            ? `Up${!compact && data.latencyMs != null ? ` · ${data.latencyMs}ms` : ""}`
            : "Unreachable"
        }
        tone={data.up ? "good" : "bad"}
      />
      {!compact && (
        <p className="text-[11px] text-muted">
          {widget.config.host}:{widget.config.port}
        </p>
      )}
    </div>
  );
}
