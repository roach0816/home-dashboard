import type { WidgetTypeId } from "@/lib/types";

export type ConfigFieldSpec = {
  key: string;
  label: string;
  type: "text" | "url" | "number" | "checkbox";
  placeholder?: string;
  helpText?: string;
  defaultValue?: string | number | boolean;
};

export type SecretFieldSpec = {
  key: string;
  label: string;
  placeholder?: string;
  helpText?: string;
};

export type WidgetDefinition = {
  type: WidgetTypeId;
  name: string;
  description: string;
  icon: string;
  /** Non-secret connection/display fields, rendered by the generic config form. */
  configFields: ConfigFieldSpec[];
  /** Credential fields, stored server-only and never sent back to the browser. */
  secretFields: SecretFieldSpec[];
  /** True for widgets with bespoke config UI (e.g. Tempest's station picker) instead of the generic form. */
  customConfig?: boolean;
};

const insecureTlsField: ConfigFieldSpec = {
  key: "insecureTls",
  label: "Allow self-signed certificate",
  type: "checkbox",
  helpText: "Common for local homelab HTTPS admin UIs.",
};

export const WIDGET_REGISTRY: WidgetDefinition[] = [
  {
    type: "tempest-weather",
    name: "Tempest Weather Station",
    description: "Current conditions and forecast from your own WeatherFlow Tempest station.",
    icon: "mdi:weather-partly-cloudy",
    customConfig: true,
    configFields: [],
    secretFields: [{ key: "token", label: "Tempest API token" }],
  },
  {
    type: "home-assistant",
    name: "Home Assistant",
    description: "Entity count and how many are unavailable.",
    icon: "selfhst:home-assistant",
    configFields: [{ key: "baseUrl", label: "Base URL", type: "url", placeholder: "http://homeassistant.local:8123" }],
    secretFields: [{ key: "token", label: "Long-lived access token", helpText: "Profile → Security → Long-lived access tokens." }],
  },
  {
    type: "proxmox",
    name: "Proxmox VE",
    description: "Node count, CPU load, and running VMs/containers.",
    icon: "selfhst:proxmox",
    configFields: [
      { key: "baseUrl", label: "Base URL", type: "url", placeholder: "https://proxmox.local:8006" },
      insecureTlsField,
    ],
    secretFields: [{ key: "apiToken", label: "API token", placeholder: "user@realm!tokenid=secret", helpText: "Datacenter → Permissions → API Tokens." }],
  },
  {
    type: "kubernetes",
    name: "Kubernetes / Rancher",
    description: "Node readiness and pod status for a k3s/Rancher cluster.",
    icon: "mdi:kubernetes",
    configFields: [{ key: "apiUrl", label: "API server URL", type: "url", placeholder: "https://k3s.local:6443" }, insecureTlsField],
    secretFields: [{ key: "token", label: "Service account bearer token" }],
  },
  {
    type: "adguard",
    name: "AdGuard Home",
    description: "Queries today and percent blocked.",
    icon: "selfhst:adguard-home",
    configFields: [{ key: "baseUrl", label: "Base URL", type: "url", placeholder: "http://adguard.local" }],
    secretFields: [
      { key: "username", label: "Username" },
      { key: "password", label: "Password" },
    ],
  },
  {
    type: "unifi",
    name: "UniFi Network",
    description: "Connected clients and WAN status.",
    icon: "selfhst:ubiquiti-unifi",
    configFields: [
      { key: "baseUrl", label: "Controller URL", type: "url", placeholder: "https://unifi.local" },
      { key: "site", label: "Site name", type: "text", defaultValue: "default" },
      insecureTlsField,
    ],
    secretFields: [
      { key: "username", label: "Local admin username" },
      { key: "password", label: "Local admin password" },
    ],
  },
  {
    type: "pihole",
    name: "Pi-hole",
    description: "Queries today, percent blocked, and blocklist size.",
    icon: "selfhst:pi-hole",
    configFields: [{ key: "baseUrl", label: "Base URL", type: "url", placeholder: "http://pi.hole" }],
    secretFields: [{ key: "password", label: "Password", helpText: "Your Pi-hole admin password (or an app password)." }],
  },
  {
    type: "portainer",
    name: "Portainer",
    description: "Running and stopped containers across all environments.",
    icon: "selfhst:portainer",
    configFields: [{ key: "baseUrl", label: "Base URL", type: "url", placeholder: "https://portainer.local:9443" }, insecureTlsField],
    secretFields: [{ key: "apiKey", label: "API access token", helpText: "User settings → Access tokens." }],
  },
  {
    type: "plex",
    name: "Plex",
    description: "Currently playing streams.",
    icon: "selfhst:plex",
    configFields: [{ key: "baseUrl", label: "Server URL", type: "url", placeholder: "http://plex.local:32400" }],
    secretFields: [{ key: "token", label: "X-Plex-Token" }],
  },
  {
    type: "jellyfin",
    name: "Jellyfin",
    description: "Active playback sessions and library size.",
    icon: "selfhst:jellyfin",
    configFields: [{ key: "baseUrl", label: "Server URL", type: "url", placeholder: "http://jellyfin.local:8096" }],
    secretFields: [{ key: "apiKey", label: "API key", helpText: "Dashboard → API Keys." }],
  },
  {
    type: "sonarr",
    name: "Sonarr",
    description: "Download queue and upcoming episodes.",
    icon: "selfhst:sonarr",
    configFields: [
      { key: "baseUrl", label: "Base URL", type: "url", placeholder: "http://sonarr.local:8989" },
      { key: "calendarDays", label: "Upcoming days", type: "number", defaultValue: 7 },
    ],
    secretFields: [{ key: "apiKey", label: "API key", helpText: "Settings → General → Security." }],
  },
  {
    type: "radarr",
    name: "Radarr",
    description: "Download queue and upcoming movies.",
    icon: "selfhst:radarr",
    configFields: [
      { key: "baseUrl", label: "Base URL", type: "url", placeholder: "http://radarr.local:7878" },
      { key: "calendarDays", label: "Upcoming days", type: "number", defaultValue: 7 },
    ],
    secretFields: [{ key: "apiKey", label: "API key", helpText: "Settings → General → Security." }],
  },
  {
    type: "truenas",
    name: "TrueNAS",
    description: "Pool usage and active alerts.",
    icon: "selfhst:truenas-scale",
    configFields: [{ key: "baseUrl", label: "Base URL", type: "url", placeholder: "https://truenas.local" }, insecureTlsField],
    secretFields: [{ key: "apiKey", label: "API key", helpText: "Settings → API Keys → Add." }],
  },
  {
    type: "uptime-kuma",
    name: "Uptime Kuma",
    description: "Monitors up vs. down.",
    icon: "selfhst:uptime-kuma",
    configFields: [{ key: "baseUrl", label: "Base URL", type: "url", placeholder: "http://uptime-kuma.local:3001" }],
    secretFields: [{ key: "apiKey", label: "API key", helpText: "Settings → API Keys." }],
  },
  {
    type: "enphase",
    name: "Enphase Solar",
    description: "Current solar production and energy produced today.",
    icon: "selfhst:enphase",
    configFields: [{ key: "baseUrl", label: "Envoy URL", type: "url", placeholder: "http://envoy.local" }],
    secretFields: [{ key: "token", label: "Envoy access token", helpText: "See README for how to generate one." }],
  },
  {
    type: "speedtest",
    name: "Internet Speed Test",
    description: "On-demand download/upload/latency test (Cloudflare, no account needed).",
    icon: "mdi:speedometer",
    configFields: [],
    secretFields: [],
  },
  {
    type: "nextcloud",
    name: "Nextcloud",
    description: "Active users and free storage.",
    icon: "selfhst:nextcloud",
    configFields: [{ key: "baseUrl", label: "Base URL", type: "url", placeholder: "https://nextcloud.local" }],
    secretFields: [
      { key: "username", label: "Admin username" },
      { key: "appPassword", label: "App password", helpText: "Personal settings → Security → Create new app password." },
    ],
  },
  {
    type: "ping-monitor",
    name: "Ping / Port Monitor",
    description: "Checks whether a host and port is reachable.",
    icon: "mdi:lan-connect",
    configFields: [
      { key: "host", label: "Host", type: "text", placeholder: "192.168.1.10" },
      { key: "port", label: "Port", type: "number", defaultValue: 443 },
    ],
    secretFields: [],
  },
];

export function getWidgetDefinition(type: WidgetTypeId): WidgetDefinition {
  const def = WIDGET_REGISTRY.find((w) => w.type === type);
  if (!def) throw new Error(`Unknown widget type: ${type}`);
  return def;
}
