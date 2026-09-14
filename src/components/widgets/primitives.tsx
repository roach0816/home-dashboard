"use client";

import WidgetLogo from "./WidgetLogo";

export type DataSource = "cloud" | "lan";

export function WidgetFrame({
  label,
  compact,
  href,
  icon,
  warning,
  sources,
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
  /** Small icon(s) next to the title showing where the data comes from. */
  sources?: DataSource[];
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
          <SourceIcons sources={sources} />
          {warning && <WarningIcon title={warning} />}
        </div>
        <WidgetLogo icon={icon} size={24} className="opacity-80" />
      </div>
      {children}
    </div>
  );
}

export function SourceIcons({ sources }: { sources?: DataSource[] }) {
  if (!sources || sources.length === 0) return null;
  return (
    <span className="flex shrink-0 items-center gap-1">
      {sources.includes("cloud") && <CloudIcon />}
      {sources.includes("lan") && <LanIcon />}
    </span>
  );
}

function CloudIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 text-muted">
      <title>Cloud data</title>
      <path d="M6.5 20q-2.28 0-3.89-1.57Q1 16.85 1 14.58q0-1.95 1.17-3.48q1.18-1.53 3.08-1.95q.63-2.3 2.5-3.72Q9.63 4 12 4q2.93 0 4.96 2.04Q19 8.07 19 11q1.73.2 2.86 1.5q1.14 1.28 1.14 3q0 1.88-1.31 3.19T18.5 20m-12-2h12q1.05 0 1.77-.73q.73-.72.73-1.77t-.73-1.77Q19.55 13 18.5 13H17v-2q0-2.07-1.46-3.54Q14.08 6 12 6Q9.93 6 8.46 7.46Q7 8.93 7 11h-.5q-1.45 0-2.47 1.03Q3 13.05 3 14.5T4.03 17q1.02 1 2.47 1m5.5-6" />
    </svg>
  );
}

function LanIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 text-emerald-500">
      <title>Local network data</title>
      <path d="M10 2c-1.11 0-2 .89-2 2v3c0 1.11.89 2 2 2h1v2H2v2h4v2H5c-1.11 0-2 .89-2 2v3c0 1.11.89 2 2 2h4c1.11 0 2-.89 2-2v-3c0-1.11-.89-2-2-2H8v-2h8v2h-1c-1.11 0-2 .89-2 2v3c0 1.11.89 2 2 2h4c1.11 0 2-.89 2-2v-3c0-1.11-.89-2-2-2h-1v-2h4v-2h-9V9h1c1.11 0 2-.89 2-2V4c0-1.11-.89-2-2-2zm0 2h4v3h-4zM5 17h4v3H5zm10 0h4v3h-4z" />
    </svg>
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
  sources,
}: {
  label: string;
  compact?: boolean;
  href?: string;
  icon?: string;
  sources?: DataSource[];
}) {
  return (
    <WidgetFrame label={label} compact={compact} href={href} icon={icon} sources={sources}>
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
  sources,
}: {
  label: string;
  error: string;
  compact?: boolean;
  href?: string;
  icon?: string;
  sources?: DataSource[];
}) {
  return (
    <WidgetFrame label={label} compact={compact} href={href} icon={icon} sources={sources}>
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
