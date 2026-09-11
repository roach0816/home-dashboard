"use client";

export function WidgetFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5 p-3.5">
      <p className="truncate text-sm font-medium text-foreground">{label}</p>
      {children}
    </div>
  );
}

export function WidgetLoading({ label }: { label: string }) {
  return (
    <WidgetFrame label={label}>
      <p className="text-xs text-muted">Loading…</p>
    </WidgetFrame>
  );
}

export function WidgetError({ label, error }: { label: string; error: string }) {
  return (
    <WidgetFrame label={label}>
      <p className="text-xs text-red-400">{error}</p>
    </WidgetFrame>
  );
}

export function StatRow({ items }: { items: Array<{ value: string | number; unit?: string; caption: string }> }) {
  return (
    <div className="flex gap-4">
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
