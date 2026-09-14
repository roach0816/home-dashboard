import "server-only";
import { readData, readWidgetSecrets } from "@/lib/store";
import { fetchWidgetData } from "@/lib/integrations";
import { describeError } from "@/lib/integrations/util";
import type { Widget } from "@/lib/types";

// Mirrors the per-type fallback each display component passes to
// useWidgetData, so the background cadence roughly matches how fresh the
// UI expects that widget type to be. Keep in sync if a display component's
// own fallback changes.
const DEFAULT_REFRESH_SECONDS_BY_TYPE: Partial<Record<Widget["type"], number>> = {
  enphase: 60,
  hdhomerun: 60,
  jellyfin: 60,
  kubernetes: 60,
  "ping-monitor": 60,
  portainer: 60,
  plex: 60,
  proxmox: 60,
  "uptime-kuma": 60,
  unifi: 60,
};
const FALLBACK_REFRESH_SECONDS = 300;

// speedtest measures the visiting browser's own connection — there's
// nothing for a server-side background task to fetch.
const SKIP_TYPES = new Set<Widget["type"]>(["speedtest"]);

// How often the scheduler re-checks which widgets are due. Also the
// practical floor on refresh cadence, regardless of a lower configured
// refreshSeconds.
const TICK_MS = 15_000;

type CacheEntry = {
  data: unknown;
  error: string | null;
  fetchedAt: number;
};

type SchedulerState = {
  cache: Map<string, CacheEntry>;
  inFlight: Set<string>;
};

declare global {
  var __widgetRefreshScheduler: SchedulerState | undefined;
}

function effectiveIntervalMs(widget: Widget): number {
  const configured = widget.config.refreshSeconds;
  const fallback = DEFAULT_REFRESH_SECONDS_BY_TYPE[widget.type] ?? FALLBACK_REFRESH_SECONDS;
  return (configured ?? fallback) * 1000;
}

async function refreshWidget(widget: Widget, state: SchedulerState): Promise<void> {
  if (state.inFlight.has(widget.id)) return;
  state.inFlight.add(widget.id);
  try {
    const secrets = await readWidgetSecrets(widget.id);
    const data = await fetchWidgetData(widget, secrets);
    state.cache.set(widget.id, { data, error: null, fetchedAt: Date.now() });
  } catch (err) {
    // Keep whatever data we last had (if any) rather than clobbering a
    // working widget with an error over one transient failure — only a
    // widget that has never succeeded ends up with no data to fall back on.
    const previous = state.cache.get(widget.id);
    state.cache.set(widget.id, {
      data: previous?.data,
      error: describeError(err, "Failed to load widget data"),
      fetchedAt: Date.now(),
    });
  } finally {
    state.inFlight.delete(widget.id);
  }
}

async function tick(state: SchedulerState): Promise<void> {
  const { widgets } = await readData();
  const currentIds = new Set(widgets.map((w) => w.id));
  for (const id of state.cache.keys()) {
    if (!currentIds.has(id)) state.cache.delete(id);
  }
  for (const widget of widgets) {
    if (SKIP_TYPES.has(widget.type)) continue;
    const entry = state.cache.get(widget.id);
    if (!entry || Date.now() - entry.fetchedAt >= effectiveIntervalMs(widget)) {
      void refreshWidget(widget, state);
    }
  }
}

function ensureScheduler(): SchedulerState {
  if (globalThis.__widgetRefreshScheduler) return globalThis.__widgetRefreshScheduler;
  const state: SchedulerState = { cache: new Map(), inFlight: new Set() };
  globalThis.__widgetRefreshScheduler = state;
  void tick(state);
  setInterval(() => void tick(state), TICK_MS);
  return state;
}

/** Called once at server boot (see src/instrumentation.ts) so the cache starts filling before the first request arrives. */
export function startWidgetRefreshScheduler(): void {
  ensureScheduler();
}

/**
 * Cached data for a widget, refreshed in the background on its own
 * schedule. Falls back to a one-off live fetch only when nothing has been
 * cached yet (a widget just added, or a request landing before the first
 * tick completes) so callers are never stuck waiting on the tick interval.
 */
export async function getWidgetData(widget: Widget): Promise<{ data: unknown; error: string | null }> {
  const state = ensureScheduler();
  const cached = state.cache.get(widget.id);
  if (cached) return cached;
  await refreshWidget(widget, state);
  return state.cache.get(widget.id) ?? { data: undefined, error: "Failed to load widget data" };
}
