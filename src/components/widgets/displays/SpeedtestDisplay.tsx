"use client";

import { useState } from "react";
import type { Widget } from "@/lib/types";
import { StatRow, SourceIcons, type DataSource } from "../primitives";
import WidgetLogo from "../WidgetLogo";

type Result = { downloadMbps: number; uploadMbps: number; latencyMs: number };

async function measureLatency(): Promise<number> {
  const start = performance.now();
  await fetch("https://speed.cloudflare.com/__down?bytes=0", { cache: "no-store" });
  return performance.now() - start;
}

async function measureDownload(): Promise<number> {
  const bytes = 25_000_000;
  const start = performance.now();
  const res = await fetch(`https://speed.cloudflare.com/__down?bytes=${bytes}`, { cache: "no-store" });
  await res.arrayBuffer();
  const seconds = (performance.now() - start) / 1000;
  return (bytes * 8) / seconds / 1_000_000;
}

async function measureUpload(): Promise<number> {
  const bytes = 10_000_000;
  const start = performance.now();
  await fetch("https://speed.cloudflare.com/__up", { method: "POST", body: new Uint8Array(bytes), cache: "no-store" });
  const seconds = (performance.now() - start) / 1000;
  return (bytes * 8) / seconds / 1_000_000;
}

// This widget does not auto-refresh (unlike the rest) — it only runs on a
// manual click, so it doesn't silently burn bandwidth every few minutes.
export default function SpeedtestDisplay({
  widget,
  compact,
  icon,
  sources,
}: {
  widget: Extract<Widget, { type: "speedtest" }>;
  compact?: boolean;
  href?: string;
  icon?: string;
  sources?: DataSource[];
}) {
  const label = widget.config.label || "Internet Speed Test";
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runTest() {
    setRunning(true);
    setError(null);
    try {
      const latencyMs = await measureLatency();
      const downloadMbps = await measureDownload();
      const uploadMbps = await measureUpload();
      setResult({ downloadMbps, uploadMbps, latencyMs });
    } catch {
      setError("Speed test failed — check your connection.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className={`flex flex-col gap-2.5 ${compact ? "p-2.5" : "p-3.5"}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{label}</p>
        <SourceIcons sources={sources} />
        <WidgetLogo icon={icon} size={24} className="opacity-80" />
        <button
          type="button"
          onClick={runTest}
          disabled={running}
          className="shrink-0 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-surface-2 disabled:opacity-50"
        >
          {running ? "Testing…" : "Run test"}
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {result && (
        <StatRow
          compact={compact}
          items={[
            { value: result.downloadMbps.toFixed(1), unit: "Mbps", caption: "download" },
            { value: result.uploadMbps.toFixed(1), unit: "Mbps", caption: "upload" },
            { value: Math.round(result.latencyMs), unit: "ms", caption: "latency" },
          ]}
        />
      )}
      {!result && !error && !running && !compact && (
        <p className="text-xs text-muted">Click Run test to measure your connection.</p>
      )}
    </div>
  );
}
