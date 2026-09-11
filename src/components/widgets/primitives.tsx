"use client";

export function WidgetFrame({
  label,
  compact,
  children,
}: {
  label: string;
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col ${compact ? "gap-1.5 p-2.5" : "gap-2.5 p-3.5"}`}>
      <p className="truncate text-sm font-medium text-foreground">{label}</p>
      {children}
    </div>
  );
}

export function WidgetLoading({ label, compact }: { label: string; compact?: boolean }) {
  return (
    <WidgetFrame label={label} compact={compact}>
      <p className="text-xs text-muted">Loading…</p>
    </WidgetFrame>
  );
}

export function WidgetError({ label, error, compact }: { label: string; error: string; compact?: boolean }) {
  return (
    <WidgetFrame label={label} compact={compact}>
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
          <span className={compact ? "text-lg font-semibold text-foreground" : "text-2xl font-semibold text-foreground"}>
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
