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

const weatherWidgetConfigSchema = z.object({
  label,
  stationId: z.number().int().positive().optional(),
  unit: z.enum(["fahrenheit", "celsius"]).default("fahrenheit"),
  display: z.enum(["full", "current", "forecast"]).default("full"),
  forecastDays: z.number().int().min(1).max(10).default(4),
});

const homeAssistantConfigSchema = z.object({ label, baseUrl, insecureTls });
const proxmoxConfigSchema = z.object({ label, baseUrl, insecureTls });
const kubernetesConfigSchema = z.object({ label, apiUrl: baseUrl, insecureTls });
const adguardConfigSchema = z.object({ label, baseUrl });
const unifiConfigSchema = z.object({ label, baseUrl, site: z.string().min(1).max(100).default("default"), insecureTls });
const piholeConfigSchema = z.object({ label, baseUrl });
const portainerConfigSchema = z.object({ label, baseUrl, insecureTls });
const plexConfigSchema = z.object({ label, baseUrl });
const jellyfinConfigSchema = z.object({ label, baseUrl });
const sonarrConfigSchema = z.object({ label, baseUrl, calendarDays: z.number().int().min(1).max(30).default(7) });
const radarrConfigSchema = z.object({ label, baseUrl, calendarDays: z.number().int().min(1).max(30).default(7) });
const truenasConfigSchema = z.object({ label, baseUrl, insecureTls });
const uptimeKumaConfigSchema = z.object({ label, baseUrl });
const enphaseConfigSchema = z.object({ label, baseUrl });
const speedtestConfigSchema = z.object({ label });
const nextcloudConfigSchema = z.object({ label, baseUrl });
const pingMonitorConfigSchema = z.object({
  label,
  host: z.string().min(1).max(300),
  port: z.number().int().min(1).max(65535).default(443),
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
