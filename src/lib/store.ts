import "server-only";
import { promises as fs } from "fs";
import path from "path";
import type { DashboardData } from "./types";
import { dashboardDataSchema, storedDataSchema } from "./schema";
import { LEGACY_MLB_STATS_ID_TO_ESPN_ID } from "./sportsLeagues";

type WidgetSecrets = Record<string, Record<string, string>>;
type StoredData = DashboardData & { widgetSecrets: WidgetSecrets };

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "dashboard.json");

const seedData: StoredData = {
  title: "Home Dashboard",
  subtitle: "Home automation, network, and homelab links.",
  theme: "default",
  widgets: [],
  widgetSecrets: {},
  categories: [
    {
      id: "home-automation",
      title: "Home Automation",
      bookmarks: [
        {
          id: "seed-1",
          title: "Home Assistant",
          url: "http://homeassistant.local:8123",
          description: "Smart home control",
          icon: "selfhst:home-assistant",
        },
        {
          id: "seed-2",
          title: "Zigbee2MQTT",
          url: "http://homeassistant.local:8080",
          description: "Zigbee device manager",
          icon: "selfhst:zigbee2mqtt",
        },
        {
          id: "seed-9",
          title: "Philips Hue",
          url: "https://my.hue.com",
          description: "Lighting bridge",
          icon: "simple-icons:philipshue",
        },
      ],
    },
    {
      id: "network-infra",
      title: "Network & Infrastructure",
      bookmarks: [
        {
          id: "seed-3",
          title: "Router",
          url: "http://192.168.1.1",
          icon: "mdi:router-network",
        },
        {
          id: "seed-4",
          title: "Pi-hole",
          url: "http://pi.hole/admin",
          description: "DNS ad blocking",
          icon: "selfhst:pi-hole",
        },
        {
          id: "seed-5",
          title: "Proxmox",
          url: "https://proxmox.local:8006",
          icon: "selfhst:proxmox",
        },
      ],
    },
    {
      id: "media-storage",
      title: "Media & Storage",
      bookmarks: [
        {
          id: "seed-6",
          title: "TrueNAS",
          url: "http://truenas.local",
          icon: "selfhst:truenas-scale",
        },
        {
          id: "seed-7",
          title: "Jellyfin",
          url: "http://jellyfin.local:8096",
          icon: "selfhst:jellyfin",
        },
      ],
    },
    {
      id: "printers",
      title: "Printers",
      bookmarks: [
        {
          id: "seed-8",
          title: "Office Printer",
          url: "http://192.168.1.50",
          description: "Web UI / ink levels",
          icon: "mdi:printer",
        },
      ],
    },
  ],
};

let writeQueue: Promise<unknown> = Promise.resolve();

async function ensureDataFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(seedData, null, 2), "utf-8");
  }
}

async function persistRaw(data: StoredData): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tmpFile = `${DATA_FILE}.${process.pid}.tmp`;
    await fs.writeFile(tmpFile, JSON.stringify(data, null, 2), "utf-8");
    await fs.rename(tmpFile, DATA_FILE);
  });
  await writeQueue;
}

/**
 * The v0.7.0 MLB-only widget ("mlb-team") was replaced by the multi-league
 * "sports-team" widget, which stores ESPN's team id instead of the MLB
 * Stats API's — two completely different numbering schemes for the same
 * teams. Without this, an existing "mlb-team" widget would fail schema
 * validation on the next read and silently wipe the *entire* dashboard back
 * to the seed data (see the safeParse fallback below) — not just that one
 * widget.
 */
function migrateLegacyWidgets(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null || !("widgets" in raw) || !Array.isArray((raw as { widgets: unknown }).widgets)) {
    return raw;
  }
  const widgets = (raw as { widgets: unknown[] }).widgets.map((w) => {
    if (typeof w !== "object" || w === null || (w as { type?: unknown }).type !== "mlb-team") return w;
    const config = (w as { config?: Record<string, unknown> }).config ?? {};
    const espnId = LEGACY_MLB_STATS_ID_TO_ESPN_ID[Number(config.teamId)];
    if (!espnId) return w; // unrecognized id — leave as-is, will fail validation and fall back like before
    return { ...w, type: "sports-team", config: { ...config, league: "mlb", teamId: espnId } };
  });
  return { ...(raw as object), widgets };
}

/** Reads the raw on-disk file, including server-only secrets. Never expose this to the client. */
async function readRaw(): Promise<StoredData> {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, "utf-8");
  const parsed = storedDataSchema.safeParse(migrateLegacyWidgets(JSON.parse(raw)));
  if (!parsed.success) {
    return seedData;
  }
  return parsed.data;
}

/** Client-facing read: strips the server-only secret store. */
export async function readData(): Promise<DashboardData> {
  const { title, subtitle, theme, categories, widgets } = await readRaw();
  return { title, subtitle, theme, categories, widgets };
}

export async function writeData(data: DashboardData): Promise<DashboardData> {
  const parsed = dashboardDataSchema.parse(data);
  const current = await readRaw();
  // Prune secrets for widgets that no longer exist so credentials don't linger forever.
  const liveIds = new Set(parsed.widgets.map((w) => w.id));
  const widgetSecrets: WidgetSecrets = {};
  for (const [id, secrets] of Object.entries(current.widgetSecrets)) {
    if (liveIds.has(id)) widgetSecrets[id] = secrets;
  }
  await persistRaw({ ...current, ...parsed, widgetSecrets });
  return parsed;
}

export async function getWidget(widgetId: string): Promise<DashboardData["widgets"][number] | undefined> {
  const { widgets } = await readRaw();
  return widgets.find((w) => w.id === widgetId);
}

/** Which secret fields are set for a widget, without exposing their values. */
export async function widgetSecretsStatus(widgetId: string): Promise<Record<string, boolean>> {
  const { widgetSecrets } = await readRaw();
  const stored = widgetSecrets[widgetId] ?? {};
  const status: Record<string, boolean> = {};
  for (const key of Object.keys(stored)) {
    status[key] = Boolean(stored[key]);
  }
  return status;
}

/** Server-only: reads a widget's actual secret values, for use by integration clients. */
export async function readWidgetSecrets(widgetId: string): Promise<Record<string, string>> {
  const { widgetSecrets } = await readRaw();
  return widgetSecrets[widgetId] ?? {};
}

/** Merges (or clears, via null) secret fields for a widget. */
export async function writeWidgetSecrets(
  widgetId: string,
  updates: Record<string, string | null>,
): Promise<Record<string, boolean>> {
  const current = await readRaw();
  const existing = { ...(current.widgetSecrets[widgetId] ?? {}) };
  for (const [key, value] of Object.entries(updates)) {
    if (value) existing[key] = value;
    else delete existing[key];
  }
  const widgetSecrets = { ...current.widgetSecrets, [widgetId]: existing };
  await persistRaw({ ...current, widgetSecrets });
  const status: Record<string, boolean> = {};
  for (const key of Object.keys(existing)) status[key] = true;
  return status;
}

export async function deleteWidgetSecrets(widgetId: string): Promise<void> {
  const current = await readRaw();
  if (!(widgetId in current.widgetSecrets)) return;
  const widgetSecrets = { ...current.widgetSecrets };
  delete widgetSecrets[widgetId];
  await persistRaw({ ...current, widgetSecrets });
}
