import { z } from "zod";

export const bookmarkSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  url: z.string().min(1).max(2000),
  description: z.string().max(500).optional(),
  icon: z.string().max(500).optional(),
});

export const categorySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  bookmarks: z.array(bookmarkSchema).max(200),
});

const label = z.string().max(200).optional();
const baseUrl = z.string().min(1).max(500);
const insecureTls = z.boolean().optional();
const refreshSeconds = z.number().int().min(5).max(3600).optional();
const cardSize = z.enum(["full", "half"]).optional();
const linkToDevice = z.boolean().optional();

const weatherWidgetConfigSchema = z.object({
  label,
  refreshSeconds,
  cardSize,
  stationId: z.number().int().positive().optional(),
  unit: z.enum(["fahrenheit", "celsius"]).default("fahrenheit"),
  display: z.enum(["full", "current", "forecast"]).default("full"),
  forecastDays: z.number().int().min(1).max(10).default(4),
});

const homeAssistantConfigSchema = z.object({ label, refreshSeconds, cardSize, linkToDevice, baseUrl, insecureTls });
const proxmoxConfigSchema = z.object({ label, refreshSeconds, cardSize, linkToDevice, baseUrl, insecureTls });
const kubernetesConfigSchema = z.object({
  label,
  refreshSeconds,
  cardSize,
  linkToDevice,
  apiUrl: baseUrl,
  insecureTls,
  rancherUrl: z.string().max(500).optional(),
});
const adguardNodeSchema = z.object({
  id: z.string().min(1),
  label: z.string().max(100).default(""),
  baseUrl: z.string().min(1).max(500),
});
// Accepts the pre-multi-node shape ({ baseUrl }) and migrates it to a single
// implicit node in place, so existing saved widgets don't break on upgrade —
// this data lives in one shared file validated as a whole, and a validation
// failure on any one widget would fall back to the seed data, wiping
// everything else in it.
const adguardConfigSchema = z.preprocess((val) => {
  if (val && typeof val === "object" && !("nodes" in val) && "baseUrl" in val) {
    const { baseUrl, ...rest } = val as Record<string, unknown>;
    return { ...rest, nodes: [{ id: "default", baseUrl }] };
  }
  return val;
}, z.object({ label, refreshSeconds, cardSize, nodes: z.array(adguardNodeSchema).min(1).max(10) }));
const unifiConfigSchema = z.object({
  label,
  refreshSeconds,
  cardSize,
  linkToDevice,
  baseUrl,
  site: z.string().min(1).max(100).default("default"),
  insecureTls,
});
const piholeConfigSchema = z.object({ label, refreshSeconds, cardSize, linkToDevice, baseUrl });
const portainerConfigSchema = z.object({ label, refreshSeconds, cardSize, linkToDevice, baseUrl, insecureTls });
const plexConfigSchema = z.object({ label, refreshSeconds, cardSize, linkToDevice, baseUrl });
const jellyfinConfigSchema = z.object({ label, refreshSeconds, cardSize, linkToDevice, baseUrl });
const sonarrConfigSchema = z.object({
  label,
  refreshSeconds,
  cardSize,
  linkToDevice,
  baseUrl,
  calendarDays: z.number().int().min(1).max(30).default(7),
});
const radarrConfigSchema = z.object({
  label,
  refreshSeconds,
  cardSize,
  linkToDevice,
  baseUrl,
  calendarDays: z.number().int().min(1).max(30).default(7),
});
const truenasConfigSchema = z.object({ label, refreshSeconds, cardSize, linkToDevice, baseUrl, insecureTls });
const uptimeKumaConfigSchema = z.object({ label, refreshSeconds, cardSize, linkToDevice, baseUrl });
const enphaseConfigSchema = z.object({ label, refreshSeconds, cardSize, linkToDevice, baseUrl });
const speedtestConfigSchema = z.object({ label, cardSize });
const nextcloudConfigSchema = z.object({ label, refreshSeconds, cardSize, linkToDevice, baseUrl });
const pingMonitorConfigSchema = z.object({
  label,
  refreshSeconds,
  cardSize,
  linkToDevice,
  host: z.string().min(1).max(300),
  port: z.number().int().min(1).max(65535).default(443),
});
const printerConfigSchema = z.object({
  label,
  refreshSeconds,
  cardSize,
  linkToDevice,
  host: z.string().min(1).max(300),
  port: z.number().int().min(1).max(65535).default(161),
});

export const widgetSchema = z.discriminatedUnion("type", [
  z.object({ id: z.string().min(1), type: z.literal("tempest-weather"), config: weatherWidgetConfigSchema }),
  z.object({ id: z.string().min(1), type: z.literal("home-assistant"), config: homeAssistantConfigSchema }),
  z.object({ id: z.string().min(1), type: z.literal("proxmox"), config: proxmoxConfigSchema }),
  z.object({ id: z.string().min(1), type: z.literal("kubernetes"), config: kubernetesConfigSchema }),
  z.object({ id: z.string().min(1), type: z.literal("adguard"), config: adguardConfigSchema }),
  z.object({ id: z.string().min(1), type: z.literal("unifi"), config: unifiConfigSchema }),
  z.object({ id: z.string().min(1), type: z.literal("pihole"), config: piholeConfigSchema }),
  z.object({ id: z.string().min(1), type: z.literal("portainer"), config: portainerConfigSchema }),
  z.object({ id: z.string().min(1), type: z.literal("plex"), config: plexConfigSchema }),
  z.object({ id: z.string().min(1), type: z.literal("jellyfin"), config: jellyfinConfigSchema }),
  z.object({ id: z.string().min(1), type: z.literal("sonarr"), config: sonarrConfigSchema }),
  z.object({ id: z.string().min(1), type: z.literal("radarr"), config: radarrConfigSchema }),
  z.object({ id: z.string().min(1), type: z.literal("truenas"), config: truenasConfigSchema }),
  z.object({ id: z.string().min(1), type: z.literal("uptime-kuma"), config: uptimeKumaConfigSchema }),
  z.object({ id: z.string().min(1), type: z.literal("enphase"), config: enphaseConfigSchema }),
  z.object({ id: z.string().min(1), type: z.literal("speedtest"), config: speedtestConfigSchema }),
  z.object({ id: z.string().min(1), type: z.literal("nextcloud"), config: nextcloudConfigSchema }),
  z.object({ id: z.string().min(1), type: z.literal("ping-monitor"), config: pingMonitorConfigSchema }),
  z.object({ id: z.string().min(1), type: z.literal("printer-snmp"), config: printerConfigSchema }),
]);

export const dashboardDataSchema = z.object({
  title: z.string().min(1).max(120).default("Home Dashboard"),
  subtitle: z.string().max(300).default(""),
  categories: z.array(categorySchema).max(50),
  widgets: z.array(widgetSchema).max(50).default([]),
});

/**
 * What actually lives on disk: the client-facing data plus a server-only
 * secret store keyed by widget id. `readData()` strips `widgetSecrets`
 * before handing data to the browser — see src/lib/store.ts.
 */
export const storedDataSchema = dashboardDataSchema.extend({
  widgetSecrets: z.record(z.string(), z.record(z.string(), z.string())).default({}),
});

export const widgetSecretsBodySchema = z.object({
  secrets: z.record(z.string(), z.string().max(1000).nullable()),
});
