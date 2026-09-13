"use client";

import SiteIcon from "../SiteIcon";

export function WidgetFrame({
  label,
  compact,
  href,
  icon,
  children,
}: {
  label: string;
  compact?: boolean;
  /** When set, the title links out to the device/service (opens in a new tab) — title only, not the whole card. */
  href?: string;
  /** Iconify id for the widget's logo, shown top-right of the title. */
  icon?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col ${compact ? "gap-1.5 p-2.5" : "gap-2.5 p-3.5"}`}>
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
      </div>
      {children}
    </div>
  );
}

export function WidgetLoading({
  label,
  compact,
  href,
  icon,
}: {
  label: string;
  compact?: boolean;
  href?: string;
  icon?: string;
}) {
  return (
    <WidgetFrame label={label} compact={compact} href={href} icon={icon}>
      <p className="text-xs text-muted">Loading…</p>
    </WidgetFrame>
  );
}

export function WidgetError({
  label,
  error,
  compact,
  href,
  icon,
}: {
  label: string;
  error: string;
  compact?: boolean;
  href?: string;
  icon?: string;
}) {
  return (
    <WidgetFrame label={label} compact={compact} href={href} icon={icon}>
      <p className={compact ? "line-clamp-3 text-xs text-red-400" : "text-xs text-red-400"}>{error}</p>
    </WidgetFrame>
  );
}

export function StatRow({
  items,
  compact,
}: {
  items: Array<{ value: string | number; unit?: string; caption: string }>;
  compact?: boolean;
}) {
  return (
    <div className={`flex ${compact ? "gap-3" : "gap-4"}`}>
      {items.map((item, i) => (
        <div key={i} className="flex flex-col">
          <span className="text-2xl font-semibold text-foreground">
            {item.value}
            {item.unit && <span className="ml-0.5 text-sm font-normal text-muted">{item.unit}</span>}
          </span>
          <span className="text-[11px] text-muted">{item.caption}</span>
        </div>
      ))}
    </div>
  );
}

export function StatusLine({ text, tone = "muted" }: { text: string; tone?: "muted" | "good" | "bad" }) {
  const color = tone === "good" ? "text-emerald-500" : tone === "bad" ? "text-red-400" : "text-muted";
  return <p className={`text-xs ${color}`}>{text}</p>;
}
