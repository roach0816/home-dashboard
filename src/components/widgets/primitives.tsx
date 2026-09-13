"use client";

import WidgetLogo from "./WidgetLogo";

export function WidgetFrame({
  label,
  compact,
  href,
  icon,
  warning,
  children,
}: {
  label: string;
  compact?: boolean;
  /** When set, the title links out to the device/service (opens in a new tab) — title only, not the whole card. */
  href?: string;
  /** Iconify id for the widget's logo, shown top-right of the title. */
  icon?: string;
  /** When set, shows a small warning triangle next to the title (hover for this text). */
  warning?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col ${compact ? "gap-1.5 p-2.5" : "gap-2.5 p-3.5"}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
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
          {warning && <WarningIcon title={warning} />}
        </div>
        <WidgetLogo icon={icon} size={24} className="opacity-80" />
      </div>
      {children}
    </div>
  );
}

function WarningIcon({ title }: { title: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="shrink-0 text-amber-500"
    >
      <title>{title}</title>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
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
          <span className="text-xl font-semibold text-foreground">
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
